import { useState, useCallback } from 'react';
import type { ShiftApiResponse, Schedule } from '../types/shift';

export function useShifts() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchShifts = useCallback(async (year: number, month: number) => {
    setLoading(true);
    setError(null);

    const cookies = sessionStorage.getItem('rakushifu-cookies');
    if (!cookies) {
      setError('ログインしてください');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/shifts?year=${year}&month=${month}`, {
        headers: {
          'X-Rakushifu-Cookies': cookies,
        },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'シフトの取得に失敗しました');
      }
      const data: ShiftApiResponse = await res.json();

      const allSchedules = data.user_submit_terms.flatMap((term) => term.schedules);
      allSchedules.sort((a, b) => a.date.localeCompare(b.date));
      setSchedules(allSchedules);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { schedules, loading, error, fetchShifts };
}
