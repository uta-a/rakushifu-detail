import { useState } from 'react';
import { View } from 'react-native';
import { formatAsMin, WEEKDAY_LABELS, type BulkRule, type DayKind, type TimeRange } from '@rakushifu/core';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { Text } from '@/components/ui/text';
import { space } from '@/theme/tokens';

const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

const KINDS: { value: DayKind; label: string }[] = [
  { value: 'work', label: '出勤' },
  { value: 'off', label: '休み' },
  { value: 'none', label: '未入力に戻す' },
];

function Label({ children }: { children: string }) {
  return <Text style={{ fontWeight: '500' }}>{children}</Text>;
}

/** 曜日を選んで、まとめて希望を入れるダイアログ（Web版の ShiftSubmitBulkDialog） */
export function BulkDialog({ open, onClose, options, defaultRange, onApply }: {
  open: boolean;
  onClose: () => void;
  /** 選べる時刻（0:00 からの分） */
  options: number[];
  /** 出勤の初期値 */
  defaultRange: TimeRange;
  onApply: (rule: BulkRule) => void;
}) {
  const [weekdays, setWeekdays] = useState<number[]>(ALL_WEEKDAYS);
  const [onlyEmpty, setOnlyEmpty] = useState(false);
  const [kind, setKind] = useState<DayKind>('work');
  const [startAsMin, setStartAsMin] = useState(defaultRange.startAsMin);
  const [endAsMin, setEndAsMin] = useState(defaultRange.endAsMin);

  const allSelected = weekdays.length === ALL_WEEKDAYS.length;
  const timeOptions = options.map((m) => ({ value: m, label: formatAsMin(m) }));

  const toggleWeekday = (weekday: number) => {
    setWeekdays((current) => (current.includes(weekday) ? current.filter((w) => w !== weekday) : [...current, weekday]));
  };

  const handleApply = () => {
    onApply({ weekdays, onlyEmpty, kind, startAsMin, endAsMin });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="一括入力"
      description="選んだ曜日にまとめて希望を入れます。確定済みの日は変わりません。"
      footer={
        <>
          <Button variant="outline" onPress={onClose}>
            キャンセル
          </Button>
          <Button disabled={weekdays.length === 0} onPress={handleApply}>
            適用
          </Button>
        </>
      }
    >
      <View style={{ gap: space[2] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Label>対象の曜日</Label>
          <Button variant="ghost" dense onPress={() => setWeekdays(allSelected ? [] : ALL_WEEKDAYS)}>
            {allSelected ? 'すべて解除' : 'すべて選択'}
          </Button>
        </View>
        {/* 7つを1行に等分する（端末の幅で折り返すと土曜だけ2行目に落ちるため） */}
        <View style={{ flexDirection: 'row', gap: space[1] }}>
          {ALL_WEEKDAYS.map((weekday) => {
            const selected = weekdays.includes(weekday);
            return (
              <Button
                key={weekday}
                dense
                variant={selected ? 'default' : 'outline'}
                accessibilityState={{ selected }}
                onPress={() => toggleWeekday(weekday)}
                style={{ flexGrow: 1, flexShrink: 1, flexBasis: 0, paddingHorizontal: 0 }}
              >
                {WEEKDAY_LABELS[weekday]}
              </Button>
            );
          })}
        </View>
      </View>

      <View style={{ gap: space[2] }}>
        <Label>入れる内容</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[1] }}>
          {KINDS.map(({ value, label }) => (
            <Button
              key={value}
              dense
              variant={kind === value ? 'default' : 'outline'}
              accessibilityState={{ selected: kind === value }}
              onPress={() => setKind(value)}
            >
              {label}
            </Button>
          ))}
        </View>
      </View>

      {kind === 'work' ? (
        <View style={{ gap: space[2] }}>
          <Label>時間</Label>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
            <Select
              label="一括入力の開始時刻"
              value={startAsMin}
              options={timeOptions}
              onChange={(value) => {
                setStartAsMin(value);
                setEndAsMin((end) => Math.max(end, value));
              }}
              style={{ flex: 1 }}
            />
            <Text tone="muted">〜</Text>
            <Select
              label="一括入力の終了時刻"
              value={endAsMin}
              options={timeOptions.filter((o) => o.value >= startAsMin)}
              onChange={setEndAsMin}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      ) : null}

      <Button
        dense
        variant={onlyEmpty ? 'default' : 'outline'}
        accessibilityState={{ selected: onlyEmpty }}
        onPress={() => setOnlyEmpty((v) => !v)}
        style={{ alignSelf: 'flex-start' }}
      >
        未入力の日だけに適用
      </Button>
    </Dialog>
  );
}
