import { useState, useCallback } from 'react';
import { calcOverlaps } from '../utils/overlap';
import type { ShiftApiResponse, StoreShiftsResponse, OverlapResult } from '../types/shift';

/**
 * 指定日の「シフトかぶり」を取得するフック。
 * 1. 自分の月シフト(/api/shifts)から所属店舗(store_id)を得る
 * 2. 店舗シフト(/api/store-shifts)を取得し、かぶりを算出する
 */
export function useOverlap(onUnauthorized?: () => void) {
  const [result, setResult] = useState<OverlapResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOverlap = useCallback(
    async (date: string) => {
      setLoading(true);
      setError(null);
      setResult(null);

      const cookies = sessionStorage.getItem('rakushifu-cookies');
      if (!cookies) {
        setError('ログインしてください');
        setLoading(false);
        return;
      }
      const headers = { 'X-Rakushifu-Cookies': cookies };
      const handleUnauthorized = () => {
        sessionStorage.removeItem('rakushifu-cookies');
        setError('セッションが切れました。再度ログインしてください');
        setLoading(false);
        onUnauthorized?.();
      };

      try {
        const [year, month] = date.split('-').map(Number);

        // 1. 自分の月シフトから所属店舗を特定
        const meRes = await fetch(`/api/shifts?year=${year}&month=${month}`, { headers });
        if (meRes.status === 401) return handleUnauthorized();
        if (!meRes.ok) throw new Error('シフトの取得に失敗しました');
        const me: ShiftApiResponse = await meRes.json();
        const storeId = me.user_submit_terms[0]?.store_id;
        if (!storeId) {
          // 当月に自分のシフトが無く店舗を特定できない
          setResult({ self: null, floor: [], kitchen: [] });
          setLoading(false);
          return;
        }

        // 2. 店舗の当日シフトを取得してかぶりを算出
        const storeRes = await fetch(`/api/store-shifts?store_id=${storeId}&date=${date}`, {
          headers,
        });
        if (storeRes.status === 401) return handleUnauthorized();
        if (!storeRes.ok) throw new Error('店舗シフトの取得に失敗しました');
        const store: StoreShiftsResponse = await storeRes.json();

        setResult(calcOverlaps(store));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'エラーが発生しました');
      } finally {
        setLoading(false);
      }
    },
    [onUnauthorized]
  );

  return { result, loading, error, fetchOverlap };
}
