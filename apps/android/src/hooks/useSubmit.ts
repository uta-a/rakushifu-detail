import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DesiredSchedule, ShiftUpsertItem, SubmitContextResponse } from '@rakushifu/core';
import { useAuth } from '@/lib/auth';

/** 提出画面の初期コンテキスト（提出期間・店舗設定・初期値の元） */
export function useSubmitContext() {
  const { call } = useAuth();
  return useQuery({
    queryKey: ['submit-context'],
    queryFn: (): Promise<SubmitContextResponse> => call((client) => client.getSubmitContext()),
  });
}

/** 指定期間の提出済み希望シフト。期間が決まるまで（start が null の間）は取得しない */
export function useDesiredShifts(startDate: string | null, endDate: string | null) {
  const { call } = useAuth();
  return useQuery({
    queryKey: ['desired', startDate, endDate],
    queryFn: async (): Promise<DesiredSchedule[]> =>
      (await call((client) => client.getDesiredShifts(startDate!, endDate!))).results,
    enabled: startDate !== null && endDate !== null,
  });
}

/**
 * 希望シフトの提出（upsert）。期間内の全日付を items に含めて渡すこと。
 * 成功したら提出状況（submitted）と提出済みの希望を取り直す。
 */
export function useSubmitShifts() {
  const { call } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: ShiftUpsertItem[]) => call((client) => client.submitShifts(items)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['submit-context'] });
      void queryClient.invalidateQueries({ queryKey: ['desired'] });
    },
  });
}
