import type { Schedule, CalendarCell, CalendarWeek, CalendarShift, DayMark } from '../types/shift';
import { calcShiftDetail } from './salaryCalculator';
import { parseShiftDate } from './date';

/** index が曜日（0=日 .. 6=土）に一致 */
export const WEEKDAY_LABELS: readonly string[] = ['日', '月', '火', '水', '木', '金', '土'];

const EMPTY_CELL: CalendarCell = { date: null, day: null };

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * ローカルタイムの Date を "YYYY-MM-DD" にする。
 * toISOString は UTC 変換で日付がずれるため使わない。
 */
export function toDateString(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/**
 * 指定月の月グリッド（週の配列）を作る。各週は必ず7セルで、
 * 先頭は日曜・末尾は土曜。月外のセルは date/day とも null。
 */
export function buildMonthGrid(year: number, month: number): CalendarWeek[] {
  const lastDate = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay();

  const cells: CalendarCell[] = [];
  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ ...EMPTY_CELL });
  }
  for (let day = 1; day <= lastDate; day++) {
    cells.push({ date: `${year}-${pad2(month)}-${pad2(day)}`, day });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ ...EMPTY_CELL });
  }

  const weeks: CalendarWeek[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

/** 年またぎを含む月の加減算 */
export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const total = year * 12 + (month - 1) + delta;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

/**
 * 並び順のキー。休みは末尾に寄せる。
 * 休み判定は calcShiftDetail の結果（detail.isOff）に一本化し、
 * グリッドの印（getDayMark）と判定源をずらさない。
 */
function startOrder(entry: CalendarShift): number {
  if (entry.detail.isOff) return Number.MAX_SAFE_INTEGER;
  return (entry.schedule.start_hour ?? 0) * 60 + (entry.schedule.start_minute ?? 0);
}

/**
 * 日付文字列 → その日のシフト一覧のマップ。
 * 1日に複数シフトがありうるため配列で保持し、開始時刻昇順（休みは末尾）に並べる。
 */
export function buildShiftsByDate(schedules: Schedule[]): Map<string, CalendarShift[]> {
  const map = new Map<string, CalendarShift[]>();

  for (const schedule of schedules) {
    const entry: CalendarShift = { schedule, detail: calcShiftDetail(schedule) };
    const list = map.get(schedule.date);
    if (list) {
      list.push(entry);
    } else {
      map.set(schedule.date, [entry]);
    }
  }

  for (const list of map.values()) {
    list.sort((a, b) => startOrder(a) - startOrder(b) || a.schedule.id - b.schedule.id);
  }

  return map;
}

/** その日のセルに出す印の種類 */
export function getDayMark(shifts: CalendarShift[] | undefined): DayMark {
  if (!shifts || shifts.length === 0) return 'none';
  if (shifts.some((s) => !s.detail.isOff)) return 'work';
  return 'off';
}

/** "2026-09-09" → "9/9（水）" */
export function formatMonthDayWithWeekday(dateStr: string): string {
  const date = parseShiftDate(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}（${WEEKDAY_LABELS[date.getDay()]}）`;
}

/** 表示月が今日を含むなら今日、含まないなら月初を選択日にする */
export function defaultSelectedDate(year: number, month: number, today: Date): string {
  if (today.getFullYear() === year && today.getMonth() + 1 === month) {
    return toDateString(today);
  }
  return `${year}-${pad2(month)}-01`;
}
