import { View } from 'react-native';
import { RakushifuError, calcShiftDetail } from '@rakushifu/core';
import { useConfirmedShifts } from '@/hooks/useConfirmedShifts';
import { Screen } from '@/components/Screen';
import { Alert } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { space } from '@/theme/tokens';

/**
 * 雛形: 今月の確定シフトを一覧で出すだけ。core のクライアントと純粋関数が
 * 端末から通ることを確かめるための画面で、月グリッドなどは後で作る。
 */
export default function CalendarScreen() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const { data, error, isPending } = useConfirmedShifts(year, month);

  return (
    <Screen>
      <Text variant="heading" tabular>
        {year}年{month}月
      </Text>

      {error ? (
        <Alert variant="destructive">
          {error instanceof RakushifuError ? error.message : 'シフトデータの取得でエラーが発生しました'}
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>確定シフト</CardTitle>
        </CardHeader>
        <CardContent padding="below-header" style={{ gap: space[3] }}>
          {isPending ? (
            <SkeletonGroup label="確定シフトを読み込み中">
              <Skeleton height={20} />
              <Skeleton height={20} />
              <Skeleton height={20} width="60%" />
            </SkeletonGroup>
          ) : data && data.length > 0 ? (
            data.map((schedule) => {
              const detail = calcShiftDetail(schedule);
              return (
                <View key={schedule.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text tabular>{schedule.date}</Text>
                  <Text tabular tone={schedule.off ? 'muted' : 'default'}>
                    {schedule.off ? '休み' : `${detail.startTime}〜${detail.endTime}`}
                  </Text>
                </View>
              );
            })
          ) : (
            <Text tone="muted">今月の確定シフトはまだありません</Text>
          )}
        </CardContent>
      </Card>
    </Screen>
  );
}
