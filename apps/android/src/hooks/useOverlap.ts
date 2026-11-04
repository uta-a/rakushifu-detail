import { useQuery } from '@tanstack/react-query';
import { calcOverlaps, type OverlapResult } from '@rakushifu/core';
import { useAuth } from '@/lib/auth';

/**
 * 指定日に同じ時間帯へ入る人。店舗は呼び出し側（カレンダー）がその日のシフトから渡し、
 * 出勤しない日は null にして取得しない（結果が空と分かっているため）。
 *
 * 確定シフトはセッション中にほぼ変わらないので、一度取った日は取り直さない
 * （日付を行き来するたびに往復しない。Web版の useOverlap のキャッシュと同じ扱い）。
 */
export function useOverlap(storeId: number | null, date: string) {
  const { call } = useAuth();
  return useQuery({
    queryKey: ['store-shifts', storeId, date],
    queryFn: async (): Promise<OverlapResult> =>
      calcOverlaps(await call((client) => client.getStoreShifts(storeId!, date))),
    enabled: storeId !== null,
    staleTime: Infinity,
  });
}
