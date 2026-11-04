import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { SalaryResult } from '@rakushifu/core';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Text, type TextTone } from '@/components/ui/text';
import { formatHours, formatYen } from '@/lib/format';
import { useTheme } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';

/**
 * 内訳1行。役割ごとの意味色は行全体（ラベルと値）に掛ける。
 * ラベルだけ・値だけ色を変えると、どこまでが1つの意味か読み取れなくなる。
 */
function BreakdownRow({ label, sub, value, tone, first }: {
  label: string;
  sub?: ReactNode;
  value: string;
  tone: TextTone;
  first?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: space[3],
        paddingVertical: space[2],
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], flexShrink: 1 }}>
        <Text tone={tone} numberOfLines={1} tabular style={{ flexShrink: 1 }}>
          {label}
        </Text>
        {sub}
      </View>
      <Text tone={tone} tabular style={{ fontWeight: '500' }}>
        {value}
      </Text>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, gap: space[1], padding: space[3] }}>
      <Text variant="caption">{label}</Text>
      <Text variant="heading" tabular>
        {value}
      </Text>
    </View>
  );
}

/** 給料見込みの合計・出勤日数・内訳（Web版の SalarySummary） */
export function SalarySummary({ result }: { result: SalaryResult }) {
  const { colors } = useTheme();
  return (
    <Card>
      <CardContent style={{ gap: space[5] }}>
        <View style={{ gap: space[1] }}>
          <CardTitle>給料見込み</CardTitle>
          <Text variant="hero" tone="work" tabular>
            {formatYen(result.totalPay)}
            <Text variant="heading" tone="muted" style={{ fontWeight: '400' }}>
              {' 円'}
            </Text>
          </Text>
        </View>

        <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg }}>
          <Stat label="出勤日数" value={`${result.totalWorkDays}日`} />
          <View style={{ width: 1, backgroundColor: colors.border }} />
          <Stat label="総勤務時間" value={formatHours(result.totalHours)} />
        </View>

        <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space[1] }}>
          {/* 内訳は3行とも役割色を持たせる。1行だけ無彩色だと未設定に見える */}
          <BreakdownRow
            first
            label={`通常給（${formatHours(result.totalNormalHours)}）`}
            value={`${formatYen(result.normalPay)}円`}
            tone="work"
          />
          <BreakdownRow
            label={`深夜割増（${formatHours(result.totalLateNightHours)}）`}
            sub={<Badge variant="outline">×1.25</Badge>}
            value={`${formatYen(result.lateNightPay)}円`}
            tone="lateNight"
          />
          <BreakdownRow
            label={`交通費（${result.totalWorkDays}日分）`}
            value={`${formatYen(result.transportTotal)}円`}
            tone="transport"
          />
        </View>
      </CardContent>
    </Card>
  );
}
