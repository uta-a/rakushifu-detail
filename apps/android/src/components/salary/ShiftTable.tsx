import { View, type TextStyle } from 'react-native';
import { parseShiftDate, WEEKDAY_LABELS, type ShiftDetail } from '@rakushifu/core';
import { Text, type TextTone } from '@/components/ui/text';
import { useTheme } from '@/theme/theme';
import { space } from '@/theme/tokens';

/**
 * 数値3列の幅（右揃え）。日付と時間は1列目に縦に積み、残りの幅を使う。
 * Web版の5列を端末の幅で横に並べると時間か深夜の列が欠けるため、列を1つ減らしている。
 */
const NUMBER_COLUMN = 56;

function formatDate(dateStr: string): string {
  const date = parseShiftDate(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}(${WEEKDAY_LABELS[date.getDay()]})`;
}

/** 表は横幅が狭いので h/m の短い表記にする（Web版と同じ） */
function formatShortHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h${m}m`;
}

function dayTone(dateStr: string): TextTone {
  const day = parseShiftDate(dateStr).getDay();
  if (day === 0) return 'sunday';
  if (day === 6) return 'saturday';
  return 'default';
}

const numberCell: TextStyle = { width: NUMBER_COLUMN, textAlign: 'right' };

/** 空欄は記号を見せ、読み上げでは「なし」と読ませる */
function Blank() {
  return (
    <Text tone="muted" tabular style={numberCell} accessibilityLabel="なし">
      –
    </Text>
  );
}

function HoursCell({ hours, tone }: { hours: number | null; tone?: TextTone }) {
  if (hours === null) return <Blank />;
  return (
    <Text tabular tone={tone} style={[numberCell, tone ? { fontWeight: '500' } : null]}>
      {formatShortHours(hours)}
    </Text>
  );
}

export function ShiftTable({ shifts }: { shifts: ShiftDetail[] }) {
  const { colors } = useTheme();

  if (shifts.length === 0) {
    return (
      <Text tone="muted" style={{ paddingVertical: space[6], textAlign: 'center' }}>
        シフトデータがありません
      </Text>
    );
  }

  const header = (label: string, style: TextStyle) => (
    <Text tone="muted" style={[{ fontWeight: '500' }, style]}>
      {label}
    </Text>
  );

  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          gap: space[2],
          paddingVertical: space[2],
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        {header('日付・時間', { flex: 1 })}
        {header('勤務', numberCell)}
        {header('通常', numberCell)}
        {header('深夜', numberCell)}
      </View>
      {shifts.map((shift, index) => (
        <View
          key={`${shift.date}-${index}`}
          accessible
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space[2],
            paddingVertical: space[2],
            borderBottomWidth: index === shifts.length - 1 ? 0 : 1,
            borderBottomColor: colors.border,
            backgroundColor: shift.isOff ? colors.muted : 'transparent',
          }}
        >
          <View style={{ flex: 1 }}>
            <Text tabular tone={shift.isOff ? 'muted' : dayTone(shift.date)} style={{ fontWeight: '500' }}>
              {formatDate(shift.date)}
            </Text>
            <Text variant="caption" tabular>
              {shift.isOff ? '休み' : `${shift.startTime} – ${shift.endTime}`}
            </Text>
          </View>
          <HoursCell hours={shift.isOff ? null : shift.totalHours} />
          <HoursCell hours={shift.isOff ? null : shift.normalHours} />
          <HoursCell
            hours={shift.isOff || shift.lateNightHours === 0 ? null : shift.lateNightHours}
            tone="lateNight"
          />
        </View>
      ))}
    </View>
  );
}
