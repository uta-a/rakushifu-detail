import { memo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { MessageSquare } from 'lucide-react-native';
import { formatAsMin, formatMonthDayWithWeekday, parseShiftDate, type DayEntry, type DayKind } from '@rakushifu/core';
import { Badge } from '@/components/ui/badge';
import { Select, type SelectOption } from '@/components/ui/select';
import { Text, type TextTone } from '@/components/ui/text';
import { useTheme } from '@/theme/theme';
import { control, fontSize, radius, space } from '@/theme/tokens';

const KINDS: SelectOption<DayKind>[] = [
  { value: 'none', label: '未入力' },
  { value: 'work', label: '出勤' },
  { value: 'off', label: '休み' },
];

const MEMO_MAX_LENGTH = 200;
/** 日付列の幅。行をまたいで希望・時刻の位置を揃える */
const DATE_COLUMN = 80;
const KIND_WIDTH = 96;
const TIME_WIDTH = 88;

function weekdayTone(weekday: number): TextTone {
  if (weekday === 0) return 'sunday';
  if (weekday === 6) return 'saturday';
  return 'default';
}

/** 提出済みの値が選択肢の刻みから外れていても、その値を見せられるようにする */
function withValue(options: number[], value: number): number[] {
  if (options.includes(value)) return options;
  return [...options, value].sort((a, b) => a - b);
}

function toTimeOptions(minutes: number[]): SelectOption<number>[] {
  return minutes.map((m) => ({ value: m, label: formatAsMin(m) }));
}

/**
 * 希望シフト提出の1日ぶんの行。
 *
 * 1行目に日付・希望・メモ、出勤なら2行目に時刻を出す（Web版の1行を端末の幅で2段にしたもの）。
 * 確定済み（fixedShiftLogId 非 null）の日と期限切れの期間では編集させない。
 */
export const DayRow = memo(function DayRow({ entry, options, disabled, invalid, onChange, first }: {
  entry: DayEntry;
  /** 選べる時刻（0:00 からの分）。曜日ごとの勤務可能時間帯で絞ったもの */
  options: number[];
  disabled: boolean;
  /** 提出時に上流が不正と指摘した日 */
  invalid: boolean;
  onChange: (entry: DayEntry) => void;
  first: boolean;
}) {
  const { colors } = useTheme();
  const [memoOpen, setMemoOpen] = useState(entry.memo !== '');

  const fixed = entry.fixedShiftLogId !== null;
  const readOnly = disabled || fixed;
  const label = formatMonthDayWithWeekday(entry.date);
  const weekday = parseShiftDate(entry.date).getDay();

  return (
    <View
      style={{
        gap: space[2],
        paddingVertical: space[2],
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.border,
        // 上流が指摘した日は左に destructive の線を引く
        borderLeftWidth: invalid ? 2 : 0,
        borderLeftColor: colors.destructive,
        paddingLeft: invalid ? space[2] : 0,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        <Text tabular tone={weekdayTone(weekday)} style={{ width: DATE_COLUMN, fontWeight: '500' }}>
          {label}
        </Text>

        {fixed ? (
          <>
            <Badge variant="outline">確定済み</Badge>
            <Text tabular tone="muted">
              {`${formatAsMin(entry.startAsMin)}〜${formatAsMin(entry.endAsMin)}`}
            </Text>
          </>
        ) : (
          <>
            <Select
              label={`${label} の希望`}
              value={entry.kind}
              options={KINDS}
              disabled={readOnly}
              onChange={(kind) => onChange({ ...entry, kind })}
              style={{ width: KIND_WIDTH }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${label} のメモ`}
              accessibilityState={{ expanded: memoOpen, disabled: readOnly }}
              disabled={readOnly}
              onPress={() => setMemoOpen((v) => !v)}
              style={({ pressed }) => ({
                marginLeft: 'auto',
                width: control.dense,
                height: control.dense,
                borderRadius: radius.md,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: pressed ? colors.accent : 'transparent',
                opacity: readOnly ? 0.5 : 1,
              })}
            >
              <MessageSquare size={16} color={entry.memo !== '' ? colors.foreground : colors.mutedForeground} />
            </Pressable>
          </>
        )}
      </View>

      {!fixed && entry.kind === 'work' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[1], paddingLeft: DATE_COLUMN + space[2] }}>
          <Select
            label={`${label} の開始時刻`}
            value={entry.startAsMin}
            options={toTimeOptions(withValue(options, entry.startAsMin))}
            disabled={readOnly}
            // 開始を終了より後ろに置けないようにする
            onChange={(start) => onChange({ ...entry, startAsMin: start, endAsMin: Math.max(entry.endAsMin, start) })}
            style={{ width: TIME_WIDTH }}
          />
          <Text variant="caption">〜</Text>
          <Select
            label={`${label} の終了時刻`}
            value={entry.endAsMin}
            options={toTimeOptions(withValue(options, entry.endAsMin).filter((m) => m >= entry.startAsMin))}
            disabled={readOnly}
            onChange={(end) => onChange({ ...entry, endAsMin: end })}
            style={{ width: TIME_WIDTH }}
          />
        </View>
      ) : null}

      {memoOpen && !fixed ? (
        <View style={{ paddingLeft: DATE_COLUMN + space[2] }}>
          <TextInput
            accessibilityLabel={`${label} のメモ`}
            placeholder="メモ（任意）"
            placeholderTextColor={colors.mutedForeground}
            maxLength={MEMO_MAX_LENGTH}
            editable={!readOnly}
            value={entry.memo}
            onChangeText={(memo) => onChange({ ...entry, memo })}
            style={{
              minHeight: control.dense,
              paddingHorizontal: space[2],
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.input,
              backgroundColor: colors.inputBackground,
              color: colors.foreground,
              fontSize: fontSize.sm,
              opacity: readOnly ? 0.5 : 1,
            }}
          />
        </View>
      ) : null}
    </View>
  );
});
