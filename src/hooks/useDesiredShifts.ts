import { useState, useCallback } from 'react';
import type { DesiredSchedule, ShiftUpsertItem } from '../types/shift';

/**
 * 提出済みの希望シフトの取得と、希望シフトの提出（upsert）。
 *
 * 他のフックと違って fetch 側は取得結果を返り値で渡す。画面は「その期間ぶんの
 * 入力状態」を組み立てる必要があり、state 経由だと期間切り替えの途中で
 * 古い結果と新しい期間が混ざるため。
 */
export function useDesiredShifts(onUnauthorized?: () => void) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  /** 422 で上流が指摘した日付。行にエラーを出すのに使う */
  const [invalidDates, setInvalidDates] = useState<string[]>([]);

  const expireSession = useCallback(() => {
    // セッション失効。保持している cookie を破棄して再ログインを促す
    sessionStorage.removeItem('rakushifu-cookies');
    onUnauthorized?.();
  }, [onUnauthorized]);

  const fetchDesiredShifts = useCallback(
    async (startDate: string, endDate: string): Promise<DesiredSchedule[] | null> => {
      setLoading(true);
      setError(null);

      const cookies = sessionStorage.getItem('rakushifu-cookies');
      if (!cookies) {
        setError('ログインしてください');
        setLoading(false);
        return null;
      }

      try {
        const res = await fetch(
          `/api/desired-shifts?start_date=${startDate}&end_date=${endDate}`,
          { headers: { 'X-Rakushifu-Cookies': cookies } }
        );
        if (res.status === 401) {
          setError('セッションが切れました。再度ログインしてください');
          setLoading(false);
          expireSession();
          return null;
        }
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || '希望シフトの取得に失敗しました');
        }
        const data: { results: DesiredSchedule[] } = await res.json();
        return data.results;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'エラーが発生しました');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [expireSession]
  );

  /** 提出できたら true。期間内の全日付を items に含めて渡すこと */
  const submitShifts = useCallback(
    async (items: ShiftUpsertItem[]): Promise<boolean> => {
      setSubmitting(true);
      setSubmitError(null);
      setInvalidDates([]);

      const cookies = sessionStorage.getItem('rakushifu-cookies');
      if (!cookies) {
        setSubmitError('ログインしてください');
        setSubmitting(false);
        return false;
      }

      try {
        const res = await fetch('/api/submit-shifts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Rakushifu-Cookies': cookies,
          },
          body: JSON.stringify({ shifts: items }),
        });
        if (res.status === 401) {
          setSubmitError('セッションが切れました。再度ログインしてください');
          setSubmitting(false);
          expireSession();
          return false;
        }
        if (res.status === 422) {
          const data = await res.json();
          setInvalidDates(Array.isArray(data.invalidDates) ? data.invalidDates : []);
          setSubmitError(data.error || '入力内容に誤りがあります');
          setSubmitting(false);
          return false;
        }
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'シフトの提出に失敗しました');
        }
        return true;
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'エラーが発生しました');
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [expireSession]
  );

  return {
    loading,
    error,
    submitting,
    submitError,
    invalidDates,
    fetchDesiredShifts,
    submitShifts,
  };
}
