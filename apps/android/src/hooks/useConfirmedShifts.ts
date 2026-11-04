import { useQuery } from '@tanstack/react-query';
import type { Schedule } from '@rakushifu/core';
import { useAuth } from '@/lib/auth';

/** 指定月の確定シフト。Web版の useShifts と同じく、提出期間ごとの schedules を平らにする */
export function useConfirmedShifts(year: number, month: number) {
  const { call } = useAuth();
  return useQuery({
    queryKey: ['confirmed', year, month],
    queryFn: async (): Promise<Schedule[]> => {
      const data = await call((client) => client.getConfirmedShifts(year, month));
      return data.user_submit_terms.flatMap((term) => term.schedules);
    },
  });
}
