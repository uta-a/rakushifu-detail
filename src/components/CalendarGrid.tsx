import { useMemo } from 'react';
import type { CalendarShift, DayMark } from '../types/shift';
import { buildMonthGrid, getDayMark, shiftMonth, WEEKDAY_LABELS } from '../utils/calendar';

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

function getWeekdayColor(weekday: number): string {
  if (weekday === 0) return 'text-red-500';
  if (weekday === 6) return 'text-blue-500';
  return 'text-gray-700';
}

function getHeaderColor(weekday: number): string {
  if (weekday === 0) return 'text-red-500';
  if (weekday === 6) return 'text-blue-500';
  return 'text-gray-500';
}

function getCircleClass(isSelected: boolean, isToday: boolean, weekday: number): string {
  // 今日と選択日が重なる場合は選択日の青を優先する
  if (isSelected) return 'bg-blue-500 text-white';
  if (isToday) return 'bg-gray-700 text-white';
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
    <div>
      <div className="flex items-center justify-center gap-2 sm:gap-4 mb-2">
        <button
          type="button"
          onClick={onPrevMonth}
          disabled={prevDisabled}
          aria-label="前の月"
          className="flex items-center justify-center h-11 w-11 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
        <div className="min-w-32 text-center">
          <p className="text-xs text-gray-500">{year}年</p>
          <p className="text-2xl font-bold text-gray-800 leading-tight">{month}月</p>
        </div>
        <button
          type="button"
          onClick={onNextMonth}
          disabled={nextDisabled}
          aria-label="次の月"
          className="flex items-center justify-center h-11 w-11 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>

      <table className="w-full table-fixed">
        <caption className="sr-only">
          {year}年{month}月のシフトカレンダー
        </caption>
        <thead>
          <tr className="bg-gray-50">
            {WEEKDAY_LABELS.map((label, weekday) => (
              <th
                key={label}
                scope="col"
                className={`py-2 text-xs font-medium ${getHeaderColor(weekday)}`}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, weekIndex) => (
            <tr key={weekIndex} className="border-b border-gray-100 last:border-0">
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
                      className="flex h-14 w-full flex-col items-center justify-center gap-1 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${getCircleClass(isSelected, isToday, weekday)}`}
                      >
                        {cell.day}
                      </span>
                      <span className="flex h-2.5 items-center gap-0.5" aria-hidden="true">
                        {Array.from({ length: dotCount }, (_, i) => (
                          <span key={i} className="h-2.5 w-2.5 rounded-full bg-gray-400" />
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
