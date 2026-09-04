import { useMemo } from 'react';
import type { CalendarShift, DayMark } from '../types/shift';
import { buildMonthGrid, getDayMark, shiftMonth, WEEKDAY_LABELS } from '../utils/calendar';
import { MonthNav } from './MonthNav';
import { cn } from '../lib/cn';

interface CalendarGridProps {
  year: number;
  month: number;
  shiftsByDate: Map<string, CalendarShift[]>;
  selectedDate: string;
  todayDate: string;
  onSelectDate: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

const MAX_DOTS = 3;

/** api/shifts.ts が受け付ける年の範囲。範囲外に移動できないようボタンを無効化する */
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

/** 曜日色は日・土のみ。それ以外は前面色に揃える */
function getWeekdayColor(weekday: number): string {
  if (weekday === 0) return 'text-sunday';
  if (weekday === 6) return 'text-saturday';
  return 'text-foreground';
}

function getHeaderColor(weekday: number): string {
  if (weekday === 0) return 'text-sunday';
  if (weekday === 6) return 'text-saturday';
  return 'text-muted-foreground';
}

function getCircleClass(isSelected: boolean, isToday: boolean, weekday: number): string {
  // 選択日は塗り、今日は輪郭。両方が重なる日は塗りを優先する
  if (isSelected) return 'bg-primary text-primary-foreground font-semibold';
  if (isToday) return cn('ring-1 ring-foreground/40 font-semibold', getWeekdayColor(weekday));
  return getWeekdayColor(weekday);
}

/** 印を出すのは勤務シフトがある日のみ。休みの日は数字だけにする */
function getDotCount(mark: DayMark, workCount: number): number {
  if (mark === 'work') return Math.min(workCount, MAX_DOTS);
  return 0;
}

function getMarkLabel(mark: DayMark, workCount: number): string {
  if (mark === 'work') return ` シフト${workCount}件`;
  if (mark === 'off') return ' 休み';
  return '';
}

export function CalendarGrid({
  year,
  month,
  shiftsByDate,
  selectedDate,
  todayDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}: CalendarGridProps) {
  const weeks = useMemo(() => buildMonthGrid(year, month), [year, month]);
  const prevDisabled = shiftMonth(year, month, -1).year < MIN_YEAR;
  const nextDisabled = shiftMonth(year, month, 1).year > MAX_YEAR;

  return (
    <div className="space-y-1">
      <MonthNav
        year={year}
        month={month}
        onPrev={onPrevMonth}
        onNext={onNextMonth}
        prevDisabled={prevDisabled}
        nextDisabled={nextDisabled}
      />

      <table className="tabular w-full table-fixed">
        <caption className="sr-only">
          {year}年{month}月のシフトカレンダー
        </caption>
        <thead>
          <tr className="border-b">
            {WEEKDAY_LABELS.map((label, weekday) => (
              <th
                key={label}
                scope="col"
                className={cn('py-2 text-xs font-medium', getHeaderColor(weekday))}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, weekIndex) => (
            <tr key={weekIndex}>
              {week.map((cell, weekday) => {
                if (cell.date === null || cell.day === null) {
                  return <td key={weekday} className="p-0" />;
                }
                const date = cell.date;
                const shifts = shiftsByDate.get(date);
                const mark = getDayMark(shifts);
                const isSelected = date === selectedDate;
                const isToday = date === todayDate;
                const workCount = shifts?.filter((s) => !s.detail.isOff).length ?? 0;
                const dotCount = getDotCount(mark, workCount);

                return (
                  <td key={weekday} className="p-0">
                    <button
                      type="button"
                      onClick={() => onSelectDate(date)}
                      aria-pressed={isSelected}
                      aria-current={isToday ? 'date' : undefined}
                      aria-label={`${year}年${month}月${cell.day}日 ${WEEKDAY_LABELS[weekday]}曜日${getMarkLabel(mark, workCount)}`}
                      className={cn(
                        'flex h-14 w-full flex-col items-center justify-center gap-1 rounded-md',
                        'transition-colors duration-150 ease-out',
                        'hover:bg-muted outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-full text-sm',
                          getCircleClass(isSelected, isToday, weekday)
                        )}
                      >
                        {cell.day}
                      </span>
                      <span className="flex h-1.5 items-center gap-1" aria-hidden="true">
                        {Array.from({ length: dotCount }, (_, i) => (
                          <span key={i} className="bg-muted-foreground h-1.5 w-1.5 rounded-full" />
                        ))}
                      </span>
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
