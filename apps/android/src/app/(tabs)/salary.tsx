import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { calcMonthlySalary, shiftMonth } from '@rakushifu/core';
import { useConfirmedShifts } from '@/hooks/useConfirmedShifts';
import { useSalarySettings } from '@/hooks/useSalarySettings';
import { MonthNav } from '@/components/MonthNav';
import { Screen } from '@/components/Screen';
import { SalarySettingsBar } from '@/components/salary/SalarySettingsBar';
import { SalarySummary } from '@/components/salary/SalarySummary';
import { ShiftTable } from '@/components/salary/ShiftTable';
import { Alert } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { errorMessage } from '@/lib/format';
import { space } from '@/theme/tokens';

/** 取得中も高さを保ち、画面が跳ねないようにする */
function SalarySkeleton() {
  return (
    <SkeletonGroup label="シフトデータを取得中" style={{ gap: space[5] }}>
      <Card>
        <CardContent style={{ gap: space[5] }}>
          <View style={{ gap: space[2] }}>
            <Skeleton height={16} width={80} />
            <Skeleton height={40} width={176} />
          </View>
          <Skeleton height={72} />
          <View style={{ gap: space[3] }}>
            <Skeleton height={16} />
            <Skeleton height={16} />
            <Skeleton height={16} />
          </View>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>シフト一覧</CardTitle>
        </CardHeader>
        <CardContent padding="below-header" style={{ gap: space[3] }}>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} height={24} />
          ))}
        </CardContent>
      </Card>
    </SkeletonGroup>
  );
}

/** 月送り + 給料サマリ + シフト表 + 設定（Web版の Dashboard） */
export default function SalaryScreen() {
  const [{ year, month }, setYearMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const { settings, save } = useSalarySettings();
  // カレンダーと同じ Query キーなので、同じ月はキャッシュから出る
  const { data, error, isPending } = useConfirmedShifts(year, month);

  const result = useMemo(() => calcMonthlySalary(data ?? [], settings), [data, settings]);

  return (
    <Screen>
      <SalarySettingsBar settings={settings} onSave={save} />
      <MonthNav year={year} month={month} onMove={(delta) => setYearMonth(shiftMonth(year, month, delta))} />

      {error ? (
        <Alert variant="destructive">{errorMessage(error, 'シフトデータの取得でエラーが発生しました')}</Alert>
      ) : isPending ? (
        <SalarySkeleton />
      ) : (
        <>
          <SalarySummary result={result} />
          <Card>
            <CardHeader>
              <CardTitle>シフト一覧</CardTitle>
            </CardHeader>
            <CardContent padding="below-header">
              <ShiftTable shifts={result.shifts} />
            </CardContent>
          </Card>
        </>
      )}
    </Screen>
  );
}
