import { memo, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { buildMonthGrid, getDayMark, WEEKDAY_LABELS, type CalendarShift, type DayMark } from '@rakushifu/core';
import { Text, type TextTone } from '@/components/ui/text';
import { useTheme } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';

const MAX_DOTS = 3;
const CELL_HEIGHT = 56;
const CIRCLE_SIZE = 32;
const DOT_SIZE = 6;

/** 曜日色は日・土のみ */
function weekdayTone(weekday: number, fallback: TextTone): TextTone {
  if (weekday === 0) return 'sunday';
  if (weekday === 6) return 'saturday';
  return fallback;
}

function markLabel(mark: DayMark, workCount: number): string {
  if (mark === 'work') return ` シフト${workCount}件`;
  if (mark === 'off') return ' 休み';
  return '';
}

interface DayCellProps {
  year: number;
  month: number;
  day: number;
  date: string;
  weekday: number;
  shifts: CalendarShift[] | undefined;
  selected: boolean;
  today: boolean;
  onSelect: (date: string) => void;
}

const DayCell = memo(function DayCell({
  year,
  month,
  day,
  date,
  weekday,
  shifts,
  selected,
  today,
  onSelect,
}: DayCellProps) {
  const { colors } = useTheme();
  const mark = getDayMark(shifts);
  const workCount = shifts?.filter((s) => !s.detail.isOff).length ?? 0;
  // 印を出すのは勤務シフトがある日のみ。休みの日は数字だけにする
  const dotCount = mark === 'work' ? Math.min(workCount, MAX_DOTS) : 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${year}年${month}月${day}日 ${WEEKDAY_LABELS[weekday]}曜日${today ? ' 今日' : ''}${markLabel(mark, workCount)}`}
      onPress={() => onSelect(date)}
      style={({ pressed }) => ({
        flex: 1,
        height: CELL_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
        gap: space[1],
        borderRadius: radius.md,
        backgroundColor: pressed ? colors.muted : 'transparent',
      })}
    >
      {/* 選択日は塗り、今日は輪郭。両方が重なる日は塗りを優先する */}
      <View
        style={{
          width: CIRCLE_SIZE,
          height: CIRCLE_SIZE,
          borderRadius: radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: selected ? colors.primary : 'transparent',
          borderWidth: !selected && today ? 1 : 0,
          borderColor: colors.mutedForeground,
        }}
      >
        <Text
          tabular
          tone={selected ? 'primaryForeground' : weekdayTone(weekday, 'default')}
          style={selected || today ? { fontWeight: '600' } : undefined}
        >
          {String(day)}
        </Text>
      </View>
      <View style={{ height: DOT_SIZE, flexDirection: 'row', gap: space[1] }}>
        {Array.from({ length: dotCount }, (_, i) => (
          <View
            key={i}
            style={{ width: DOT_SIZE, height: DOT_SIZE, borderRadius: radius.full, backgroundColor: colors.work }}
          />
        ))}
      </View>
    </Pressable>
  );
});

interface CalendarGridProps {
  year: number;
  month: number;
  shiftsByDate: Map<string, CalendarShift[]>;
  selectedDate: string;
  todayDate: string;
  onSelectDate: (date: string) => void;
}

/** 月グリッド。Web版の CalendarGrid と同じ見た目（日曜始まり・勤務日に点） */
export function CalendarGrid({ year, month, shiftsByDate, selectedDate, todayDate, onSelectDate }: CalendarGridProps) {
  const { colors } = useTheme();
  const weeks = useMemo(() => buildMonthGrid(year, month), [year, month]);

  return (
    <View>
      <View
        importantForAccessibility="no-hide-descendants"
        style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border }}
      >
        {WEEKDAY_LABELS.map((label, weekday) => (
          <Text
            key={label}
            variant="caption"
            tone={weekdayTone(weekday, 'muted')}
            style={{ flex: 1, textAlign: 'center', paddingVertical: space[2], fontWeight: '500' }}
          >
            {label}
          </Text>
        ))}
      </View>
      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={{ flexDirection: 'row' }}>
          {week.map((cell, weekday) =>
            cell.date === null || cell.day === null ? (
              <View key={weekday} style={{ flex: 1, height: CELL_HEIGHT }} />
            ) : (
              <DayCell
                key={weekday}
                year={year}
                month={month}
                day={cell.day}
                date={cell.date}
                weekday={weekday}
                shifts={shiftsByDate.get(cell.date)}
                selected={cell.date === selectedDate}
                today={cell.date === todayDate}
                onSelect={onSelectDate}
              />
            ),
          )}
        </View>
      ))}
    </View>
  );
}
