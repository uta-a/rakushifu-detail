import { useState, useCallback } from 'react';
import type { SubmitContextResponse } from '../types/shift';

/** 希望シフト提出画面の初期コンテキスト（提出期間・店舗設定・初期値の元）を取る */
export function useSubmitContext(onUnauthorized?: () => void) {
  const [context, setContext] = useState<SubmitContextResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContext = useCallback(async () => {
    setLoading(true);
    setError(null);

    const cookies = sessionStorage.getItem('rakushifu-cookies');
    if (!cookies) {
      setError('ログインしてください');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/submit-context', {
        headers: {
          'X-Rakushifu-Cookies': cookies,
        },
      });
      if (res.status === 401) {
        // セッション失効。保持している cookie を破棄して再ログインを促す
        sessionStorage.removeItem('rakushifu-cookies');
        setContext(null);
        setError('セッションが切れました。再度ログインしてください');
        setLoading(false);
        onUnauthorized?.();
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '提出情報の取得に失敗しました');
      }
      const data: SubmitContextResponse = await res.json();
      setContext(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      setContext(null);
    } finally {
      setLoading(false);
    }
  }, [onUnauthorized]);

  return { context, loading, error, fetchContext };
}
