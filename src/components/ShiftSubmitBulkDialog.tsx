import { useState } from 'react';
import type { DayKind } from '../types/shift';
import type { BulkRule, TimeRange } from '../utils/shiftSubmit';
import { formatAsMin } from '../utils/shiftSubmit';
import { WEEKDAY_LABELS } from '../utils/calendar';
import { cn } from '../lib/cn';
import { Button } from './ui/button';
import { Dialog } from './ui/dialog';
import { Label } from './ui/label';
import { Select } from './ui/select';

const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

const KINDS: { value: DayKind; label: string }[] = [
  { value: 'work', label: '出勤' },
  { value: 'off', label: '休み' },
  { value: 'none', label: '未入力に戻す' },
];

function weekdayColor(weekday: number): string {
  if (weekday === 0) return 'text-sunday';
  if (weekday === 6) return 'text-saturday';
  return '';
}

interface ShiftSubmitBulkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 選べる時刻（0:00 からの分） */
  options: number[];
  /** 出勤の初期値 */
  defaultRange: TimeRange;
  onApply: (rule: BulkRule) => void;
}

/** 曜日を選んで、まとめて希望を入れるモーダル */
export function ShiftSubmitBulkDialog({
  open,
  onOpenChange,
  options,
  defaultRange,
  onApply,
}: ShiftSubmitBulkDialogProps) {
  const [weekdays, setWeekdays] = useState<number[]>(ALL_WEEKDAYS);
  const [onlyEmpty, setOnlyEmpty] = useState(false);
  const [kind, setKind] = useState<DayKind>('work');
  const [startAsMin, setStartAsMin] = useState(defaultRange.startAsMin);
  const [endAsMin, setEndAsMin] = useState(defaultRange.endAsMin);

  const allSelected = weekdays.length === ALL_WEEKDAYS.length;

  const toggleWeekday = (weekday: number) => {
    setWeekdays((current) =>
      current.includes(weekday) ? current.filter((w) => w !== weekday) : [...current, weekday]
    );
  };

  const handleApply = () => {
    onApply({ weekdays, onlyEmpty, kind, startAsMin, endAsMin });
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="一括入力"
      description="選んだ曜日にまとめて希望を入れます。確定済みの日は変わりません。"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button size="sm" disabled={weekdays.length === 0} onClick={handleApply}>
            適用
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label id="bulk-weekdays-label">対象の曜日</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setWeekdays(allSelected ? [] : ALL_WEEKDAYS)}
          >
            {allSelected ? 'すべて解除' : 'すべて選択'}
          </Button>
        </div>
        <div role="group" aria-labelledby="bulk-weekdays-label" className="flex flex-wrap gap-1">
          {ALL_WEEKDAYS.map((weekday) => {
            const selected = weekdays.includes(weekday);
            return (
              <Button
                key={weekday}
                size="sm"
                variant={selected ? 'default' : 'outline'}
                aria-pressed={selected}
                className={cn('w-10', !selected && weekdayColor(weekday))}
                onClick={() => toggleWeekday(weekday)}
              >
                {WEEKDAY_LABELS[weekday]}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label id="bulk-kind-label">入れる内容</Label>
        <div role="group" aria-labelledby="bulk-kind-label" className="flex flex-wrap gap-1">
          {KINDS.map(({ value, label }) => (
            <Button
              key={value}
              size="sm"
              variant={kind === value ? 'default' : 'outline'}
              aria-pressed={kind === value}
              onClick={() => setKind(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {kind === 'work' && (
        <div className="space-y-2">
          <Label id="bulk-time-label">時間</Label>
          <div aria-labelledby="bulk-time-label" className="flex items-center gap-2">
            <Select
              aria-label="一括入力の開始時刻"
              className="h-9"
              value={startAsMin}
              onChange={(e) => {
                const value = Number(e.target.value);
                setStartAsMin(value);
                setEndAsMin((end) => Math.max(end, value));
              }}
            >
              {options.map((m) => (
                <option key={m} value={m}>
                  {formatAsMin(m)}
                </option>
              ))}
            </Select>
            <span className="text-muted-foreground text-sm">〜</span>
            <Select
              aria-label="一括入力の終了時刻"
              className="h-9"
              value={endAsMin}
              onChange={(e) => setEndAsMin(Number(e.target.value))}
            >
              {options
                .filter((m) => m >= startAsMin)
                .map((m) => (
                  <option key={m} value={m}>
                    {formatAsMin(m)}
                  </option>
                ))}
            </Select>
          </div>
        </div>
      )}

      <Button
        variant={onlyEmpty ? 'default' : 'outline'}
        size="sm"
        aria-pressed={onlyEmpty}
        onClick={() => setOnlyEmpty((v) => !v)}
      >
        未入力の日だけに適用
      </Button>
    </Dialog>
  );
}
