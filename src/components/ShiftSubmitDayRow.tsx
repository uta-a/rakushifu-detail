import { useRef, useState, type KeyboardEvent } from 'react';
import { MessageSquare } from 'lucide-react';
import type { DayEntry, DayKind } from '../types/shift';
import { formatAsMin } from '../utils/shiftSubmit';
import { formatMonthDayWithWeekday } from '../utils/calendar';
import { parseShiftDate } from '../utils/date';
import { cn } from '../lib/cn';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select } from './ui/select';

const KINDS: { value: DayKind; label: string }[] = [
  { value: 'none', label: '未入力' },
  { value: 'work', label: '出勤' },
  { value: 'off', label: '休み' },
];

const MEMO_MAX_LENGTH = 200;

function weekdayColor(weekday: number): string {
  if (weekday === 0) return 'text-sunday';
  if (weekday === 6) return 'text-saturday';
  return '';
}

/** 提出済みの値が選択肢の刻みから外れていても、その値を見せられるようにする */
function withValue(options: number[], value: number): number[] {
  if (options.includes(value)) return options;
  return [...options, value].sort((a, b) => a - b);
}

interface ShiftSubmitDayRowProps {
  entry: DayEntry;
  /** 選べる時刻（0:00 からの分）。曜日ごとの勤務可能時間帯で絞ったもの */
  options: number[];
  disabled: boolean;
  /** 提出時に上流が不正と指摘した日 */
  invalid?: boolean;
  onChange: (entry: DayEntry) => void;
}

/**
 * 希望シフト提出の1日ぶんの行。
 * 確定済み（fixedShiftLogId 非 null）の日と期限切れの期間では編集させない。
 */
export function ShiftSubmitDayRow({
  entry,
  options,
  disabled,
  invalid = false,
  onChange,
}: ShiftSubmitDayRowProps) {
  const groupRef = useRef<HTMLDivElement>(null);
  const [memoOpen, setMemoOpen] = useState(entry.memo !== '');

  const fixed = entry.fixedShiftLogId !== null;
  const readOnly = disabled || fixed;
  const label = formatMonthDayWithWeekday(entry.date);
  const weekday = parseShiftDate(entry.date).getDay();

  const moveTo = (index: number) => {
    const next = KINDS[(index + KINDS.length) % KINDS.length].value;
    onChange({ ...entry, kind: next });
    groupRef.current?.querySelector<HTMLButtonElement>(`[data-kind="${next}"]`)?.focus();
  };

  // radiogroup の作法に合わせ、矢印キーで移動と同時に選択する（automatic activation）
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (readOnly) return;
    const current = KINDS.findIndex((k) => k.value === entry.kind);
    const moves: Record<string, () => void> = {
      ArrowRight: () => moveTo(current + 1),
      ArrowDown: () => moveTo(current + 1),
      ArrowLeft: () => moveTo(current - 1),
      ArrowUp: () => moveTo(current - 1),
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    move();
  };

  const handleStartChange = (value: number) => {
    // 開始を終了より後ろに置けないようにする
    onChange({ ...entry, startAsMin: value, endAsMin: Math.max(entry.endAsMin, value) });
  };

  return (
    <li className={cn('space-y-2 py-3', invalid && 'border-destructive border-l-2 pl-2')}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn('tabular w-24 shrink-0 text-sm font-medium', weekdayColor(weekday))}>
          {label}
        </span>

        {fixed ? (
          <>
            <Badge variant="outline">確定済み</Badge>
            <span className="tabular text-muted-foreground text-sm">
              {formatAsMin(entry.startAsMin)}〜{formatAsMin(entry.endAsMin)}
            </span>
          </>
        ) : (
          <div
            ref={groupRef}
            role="radiogroup"
            aria-label={`${label} の希望`}
            onKeyDown={handleKeyDown}
            className="flex items-center gap-1"
          >
            {KINDS.map(({ value, label: kindLabel }) => {
              const selected = entry.kind === value;
              return (
                <Button
                  key={value}
                  size="sm"
                  variant={selected ? 'default' : 'outline'}
                  role="radio"
                  data-kind={value}
                  aria-checked={selected}
                  tabIndex={selected ? 0 : -1}
                  disabled={readOnly}
                  onClick={() => onChange({ ...entry, kind: value })}
                >
                  {kindLabel}
                </Button>
              );
            })}
          </div>
        )}

        {!fixed && (
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={memoOpen}
            aria-label={`${label} のメモ`}
            disabled={readOnly}
            onClick={() => setMemoOpen((v) => !v)}
          >
            <MessageSquare aria-hidden="true" />
          </Button>
        )}
      </div>

      {entry.kind === 'work' && !fixed && (
        <div className="flex items-center gap-2 pl-24">
          <Select
            aria-label={`${label} の開始時刻`}
            className="h-9 w-28"
            disabled={readOnly}
            value={entry.startAsMin}
            onChange={(e) => handleStartChange(Number(e.target.value))}
          >
            {withValue(options, entry.startAsMin).map((m) => (
              <option key={m} value={m}>
                {formatAsMin(m)}
              </option>
            ))}
          </Select>
          <span className="text-muted-foreground text-sm">〜</span>
          <Select
            aria-label={`${label} の終了時刻`}
            className="h-9 w-28"
            disabled={readOnly}
            value={entry.endAsMin}
            onChange={(e) => onChange({ ...entry, endAsMin: Number(e.target.value) })}
          >
            {withValue(options, entry.endAsMin)
              .filter((m) => m >= entry.startAsMin)
              .map((m) => (
                <option key={m} value={m}>
                  {formatAsMin(m)}
                </option>
              ))}
          </Select>
        </div>
      )}

      {memoOpen && !fixed && (
        <div className="pl-24">
          <Input
            aria-label={`${label} のメモ`}
            className="h-9"
            placeholder="メモ（任意）"
            maxLength={MEMO_MAX_LENGTH}
            disabled={readOnly}
            value={entry.memo}
            onChange={(e) => onChange({ ...entry, memo: e.target.value })}
          />
        </div>
      )}
    </li>
  );
}
