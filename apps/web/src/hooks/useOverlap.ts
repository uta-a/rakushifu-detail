import { useState, useCallback, useRef } from 'react';
import { calcOverlaps } from '../utils/overlap';
import type { StoreShiftsResponse, OverlapResult } from '../types/shift';

/**
 * 指定日の「シフトかぶり」を取得するフック。
 *
 * 店舗は呼び出し側（カレンダー）がその日のシフトから渡す。ここで自分の月シフトを
 * 取り直すと、日付を選ぶたびに既に持っているデータを再取得することになる。
 *
 * 取得済みの結果は店舗＋日付ごとにキャッシュする。カレンダーでは日付を行き来する
 * 操作が多く、同じ日を選び直すたびに往復するのは無駄なため。確定シフトはセッション中に
 * ほぼ変わらないので、キャッシュの破棄は再ログイン（＝再マウント）に任せる。
 */
export function useOverlap(onUnauthorized?: () => void) {
  const [result, setResult] = useState<OverlapResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cacheRef = useRef(new Map<string, OverlapResult>());
  /** 日付を続けて切り替えたとき、古い応答で新しい表示を上書きしないための番号 */
  const requestIdRef = useRef(0);

  const fetchOverlap = useCallback(
    async (storeId: number, date: string) => {
      const key = `${storeId}:${date}`;
      const cached = cacheRef.current.get(key);
      if (cached) {
        requestIdRef.current += 1;
        setResult(cached);
        setError(null);
        setLoading(false);
        return;
      }

      const requestId = ++requestIdRef.current;
      const isStale = () => requestId !== requestIdRef.current;

      setLoading(true);
      setError(null);
      setResult(null);

      const cookies = sessionStorage.getItem('rakushifu-cookies');
      if (!cookies) {
        setError('ログインしてください');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/store-shifts?store_id=${storeId}&date=${date}`, {
          headers: { 'X-Rakushifu-Cookies': cookies },
        });
        if (res.status === 401) {
          // セッション失効。保持している cookie を破棄して再ログインを促す
          sessionStorage.removeItem('rakushifu-cookies');
          if (!isStale()) {
            setError('セッションが切れました。再度ログインしてください');
            setLoading(false);
          }
          onUnauthorized?.();
          return;
        }
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || '店舗シフトの取得に失敗しました');
        }
        const store: StoreShiftsResponse = await res.json();

        const overlaps = calcOverlaps(store);
        cacheRef.current.set(key, overlaps);
        if (isStale()) return;
        setResult(overlaps);
      } catch (err) {
        if (isStale()) return;
        setError(err instanceof Error ? err.message : 'エラーが発生しました');
      } finally {
        // 新しい取得が走っているなら、そちらの loading を消さない
        if (!isStale()) setLoading(false);
      }
    },
    [onUnauthorized]
  );

  return { result, loading, error, fetchOverlap };
}
