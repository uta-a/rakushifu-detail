import type { ReactNode } from 'react';
import { View } from 'react-native';
import { CalendarOff, Moon, StickyNote } from 'lucide-react-native';
import { formatMonthDayWithWeekday, type CalendarShift } from '@rakushifu/core';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { Text, type TextTone } from '@/components/ui/text';
import { formatHours } from '@/lib/format';
import { useTheme } from '@/theme/theme';
import { fontSize, space, tightTracking } from '@/theme/tokens';

/** 取得中と「シフトなし」で高さを揃える（Web の min-h-32） */
const MIN_HEIGHT = 128;

/** 内訳1行。意味色はラベルと値の両方に掛ける */
function DetailRow({ label, value, tone, icon, badge }: {
  label: string;
  value: string;
  tone?: TextTone;
  icon?: ReactNode;
  badge?: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        {icon}
        <Text tone={tone ?? 'muted'}>{label}</Text>
        {badge ? <Badge variant="outline">{badge}</Badge> : null}
      </View>
      <Text tone={tone} tabular style={{ fontWeight: '500' }}>
        {value}
      </Text>
    </View>
  );
}

function ShiftCard({ shift }: { shift: CalendarShift }) {
  const { colors } = useTheme();
  const { schedule, detail } = shift;
  const memo = schedule.memo_text?.trim();
  const hasLateNight = detail.lateNightHours > 0;

  return (
    <Card>
      <CardContent style={{ gap: space[4] }}>
        {detail.isOff ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
            <Moon size={16} color={colors.mutedForeground} />
            <Text tone="muted" style={{ fontSize: fontSize.base, fontWeight: '500' }}>
              休み
            </Text>
          </View>
        ) : (
          <View style={{ gap: space[3] }}>
            <Text variant="heading" tabular style={{ fontSize: fontSize['2xl'], letterSpacing: tightTracking(fontSize['2xl']) }}>
              {`${detail.startTime} – ${detail.endTime}`}
            </Text>
            {/* 時刻の下に縦線を通し、その日の内訳をぶら下げる */}
            <View
              style={{
                marginLeft: space[1],
                paddingLeft: space[4],
                borderLeftWidth: 2,
                borderLeftColor: colors.work,
                gap: space[2],
              }}
            >
              <DetailRow label="勤務時間" value={formatHours(detail.totalHours)} tone="work" />
              <DetailRow label="通常" value={formatHours(detail.normalHours)} tone="work" />
              <DetailRow
                label="深夜"
                value={hasLateNight ? formatHours(detail.lateNightHours) : 'なし'}
                tone={hasLateNight ? 'lateNight' : undefined}
                icon={<Moon size={14} color={hasLateNight ? colors.lateNight : colors.mutedForeground} />}
                badge={hasLateNight ? '×1.25' : undefined}
              />
            </View>
          </View>
        )}

        {memo ? (
          <View
            style={{
              flexDirection: 'row',
              gap: space[2],
              paddingTop: space[3],
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            <StickyNote size={16} color={colors.mutedForeground} style={{ marginTop: 2 }} />
            <Text tone="muted" style={{ flex: 1 }}>
              {memo}
            </Text>
          </View>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** 選択日の見出しとシフトの詳細 */
export function CalendarDayDetail({ date, shifts, loading }: {
  date: string;
  shifts: CalendarShift[];
  loading: boolean;
}) {
  const { colors } = useTheme();

  return (
    <View style={{ gap: space[3] }} accessibilityLiveRegion="polite">
      <Text variant="title" accessibilityRole="header" tabular>
        {formatMonthDayWithWeekday(date)}
      </Text>

      {/* 取得中は「シフトなし」を出さない（前月のデータでちらつかせない） */}
      {loading ? (
        <Card>
          <CardContent>
            <SkeletonGroup label="シフトデータを取得中" style={{ minHeight: MIN_HEIGHT, gap: space[3] }}>
              <Skeleton height={32} width={160} />
              <View style={{ gap: space[2], paddingLeft: space[4] }}>
                <Skeleton height={16} />
                <Skeleton height={16} />
                <Skeleton height={16} />
              </View>
            </SkeletonGroup>
          </CardContent>
        </Card>
      ) : shifts.length === 0 ? (
        <Card>
          <CardContent style={{ minHeight: MIN_HEIGHT, alignItems: 'center', justifyContent: 'center', gap: space[2] }}>
            <CalendarOff size={24} color={colors.mutedForeground} />
            <Text tone="muted">この日のシフトはありません</Text>
          </CardContent>
        </Card>
      ) : (
        shifts.map((shift, index) => <ShiftCard key={`${shift.schedule.id}-${index}`} shift={shift} />)
      )}
    </View>
  );
}
