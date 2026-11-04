import type { ReactNode } from 'react';
import { View } from 'react-native';
import { ChefHat, UtensilsCrossed } from 'lucide-react-native';
import type { OverlapEntry } from '@rakushifu/core';
import { useOverlap } from '@/hooks/useOverlap';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { errorMessage, formatMin } from '@/lib/format';
import { useTheme } from '@/theme/theme';
import { space } from '@/theme/tokens';

function OverlapSection({ title, icon, tone, entries }: {
  title: string;
  icon: ReactNode;
  /** 職種ごとの意味色。アイコン・見出し・かぶり時間に同じ色を掛ける */
  tone: 'floor' | 'kitchen';
  entries: OverlapEntry[];
}) {
  const { colors } = useTheme();
  return (
    <Card>
      <CardHeader style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        {icon}
        <Text variant="cardTitle" tone={tone} accessibilityRole="header">
          {title}
        </Text>
        <View style={{ marginLeft: 'auto' }}>
          <Badge variant="secondary">{`${entries.length}人`}</Badge>
        </View>
      </CardHeader>
      <CardContent padding="below-header">
        {entries.length === 0 ? (
          <Text tone="muted" style={{ paddingVertical: space[2] }}>
            かぶっている人はいません
          </Text>
        ) : (
          entries.map((e, i) => (
            <View
              key={`${e.name}-${i}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: space[3],
                paddingVertical: space[2],
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: colors.border,
              }}
            >
              <Text numberOfLines={1} style={{ flex: 1, fontWeight: '500' }}>
                {e.name}
              </Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text tabular>{`${formatMin(e.startAsMin)}–${formatMin(e.endAsMin)}`}</Text>
                <Text variant="caption" tone={tone} tabular>
                  {`かぶり ${formatMin(e.overlapStartAsMin)}–${formatMin(e.overlapEndAsMin)}`}
                </Text>
              </View>
            </View>
          ))
        )}
      </CardContent>
    </Card>
  );
}

/**
 * カレンダーで選んだ日に、同じ時間帯へ入るフロア／キッチンの人を出す。
 * storeId は、その日に出勤しない（休み・シフトなし・取得中）なら null。
 */
export function DayOverlap({ date, storeId }: { date: string; storeId: number | null }) {
  const { colors } = useTheme();
  const { data, error, isPending } = useOverlap(storeId, date);

  if (storeId === null) return null;

  if (error) {
    return <Alert variant="destructive">{errorMessage(error, '店舗シフトの取得に失敗しました')}</Alert>;
  }

  if (isPending) {
    return (
      <SkeletonGroup label="同じ時間に入る人を取得中" style={{ gap: space[5] }}>
        {[0, 1].map((i) => (
          <Card key={i}>
            <CardContent style={{ gap: space[3] }}>
              <Skeleton height={16} width={96} />
              <Skeleton height={20} />
              <Skeleton height={20} />
            </CardContent>
          </Card>
        ))}
      </SkeletonGroup>
    );
  }

  if (!data.self) return null;

  return (
    <View style={{ gap: space[5] }}>
      <Text variant="cardTitle" tone="muted" accessibilityRole="header">
        同じ時間に入る人
      </Text>
      <OverlapSection
        title="フロア"
        tone="floor"
        icon={<UtensilsCrossed size={16} color={colors.floor} />}
        entries={data.floor}
      />
      <OverlapSection
        title="キッチン"
        tone="kitchen"
        icon={<ChefHat size={16} color={colors.kitchen} />}
        entries={data.kitchen}
      />
    </View>
  );
}
