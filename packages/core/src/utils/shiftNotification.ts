import type { Schedule, SubmitTerm } from '../types/shift.ts';
import { formatMonthDayWithWeekday, toDateString } from './calendar.ts';

/**
 * 通知（Android版のバックグラウンド確認）のための差分検出。
 *
 * 確認のたびに「確定シフトと提出期間のスナップショット」を作り、前回のものと比べて
 * 知らせるべき出来事を返す。保存と通知の送信は呼び出し側（Android）が行う。
 */

/** 未提出のまま締切がこの時間内に迫ったら知らせる */
export const DEADLINE_NOTICE_HOURS = 24;

/** 知らせる日付をこの数まで並べ、残りは「ほかN日」にする */
const MAX_LISTED_DATES = 3;

export interface TermSnapshot {
  endDate: string;
  submitEndAt: string;
  submitted: boolean;
}

export interface ShiftSnapshot {
  /** 取得した月（"YYYY-MM"）。前回取っていない月の差分は知らせない */
  months: string[];
  /** 日付 → "17:00-22:00"（複数なら "," でつなぐ）または "off" */
  shifts: Record<string, string>;
  /** 提出期間の開始日 → 締切と提出状況 */
  terms: Record<string, TermSnapshot>;
  /** 締切が近いと知らせ済みの提出期間（開始日） */
  notifiedDeadlines: string[];
}

export type ShiftEvent =
  | { type: 'published'; dates: string[] }
  | { type: 'changed'; dates: string[] }
  | { type: 'term-opened'; startDate: string; endDate: string; submitEndAt: string }
  | { type: 'deadline'; startDate: string; endDate: string; submitEndAt: string };

export interface ShiftNotificationContent {
  title: string;
  body: string;
  /** 通知を押したときに開くタブ */
  target: 'calendar' | 'submit';
}

/** "17:00"。日跨ぎの 24 時以降（"26:30"）もそのまま書く */
function hm(hour: number | null, minute: number | null): string {
  return `${String(hour ?? 0).padStart(2, '0')}:${String(minute ?? 0).padStart(2, '0')}`;
}

function startOrder(s: Schedule): number {
  if (s.off) return Number.MAX_SAFE_INTEGER;
  return (s.start_hour ?? 0) * 60 + (s.start_minute ?? 0);
}

function describeSchedule(s: Schedule): string {
  if (s.off) return 'off';
  return `${hm(s.start_hour, s.start_minute)}-${hm(s.end_hour, s.end_minute)}`;
}

/**
 * 取得結果からスナップショットを作る。
 * schedules は確定シフト API（取得した月すべて）の schedules を平らにしたもの。
 */
export function buildShiftSnapshot(input: { months: string[]; schedules: Schedule[]; terms: SubmitTerm[] }): ShiftSnapshot {
  const byDate = new Map<string, Schedule[]>();
  for (const s of input.schedules) {
    const list = byDate.get(s.date);
    if (list) list.push(s);
    else byDate.set(s.date, [s]);
  }

  const shifts: Record<string, string> = {};
  for (const [date, list] of [...byDate].sort(([a], [b]) => a.localeCompare(b))) {
    list.sort((a, b) => startOrder(a) - startOrder(b) || a.id - b.id);
    shifts[date] = list.map(describeSchedule).join(',');
  }

  const terms: Record<string, TermSnapshot> = {};
  for (const t of input.terms) {
    terms[t.start_date] = { endDate: t.end_date, submitEndAt: t.submit_end_at, submitted: t.submitted };
  }

  return { months: [...input.months], shifts, terms, notifiedDeadlines: [] };
}

function isDeadlineNear(term: TermSnapshot, now: Date): boolean {
  if (term.submitted) return false;
  const deadline = Date.parse(term.submitEndAt);
  if (Number.isNaN(deadline)) return false;
  const remaining = deadline - now.getTime();
  return remaining > 0 && remaining <= DEADLINE_NOTICE_HOURS * 60 * 60 * 1000;
}

/**
 * 前回（prev）と今回（next）を比べ、知らせる出来事と、次回に引き継ぐスナップショットを返す。
 *
 * - 初回（prev が null）は基準にするだけで、シフトと提出期間の差分は知らせない
 *   （入れた直後に今あるシフトを全部「新しく出た」と知らせないため）。締切だけは知らせる。
 * - 今日より前の日と、前回取っていなかった月の日は比べない（月が変わって対象になった月を
 *   丸ごと「新しく出た」と知らせないため）。
 * - 締切の通知は期間ごとに一度だけ。知らせた期間を snapshot.notifiedDeadlines に残す。
 */
export function diffShiftSnapshots(
  prev: ShiftSnapshot | null,
  next: ShiftSnapshot,
  now: Date,
): { events: ShiftEvent[]; snapshot: ShiftSnapshot } {
  const events: ShiftEvent[] = [];
  const today = toDateString(now);

  if (prev) {
    const comparable = (date: string) =>
      date >= today && prev.months.includes(date.slice(0, 7)) && next.months.includes(date.slice(0, 7));

    const published: string[] = [];
    const changed: string[] = [];
    const dates = new Set([...Object.keys(prev.shifts), ...Object.keys(next.shifts)]);
    for (const date of [...dates].sort()) {
      if (!comparable(date)) continue;
      const before = prev.shifts[date];
      const after = next.shifts[date];
      if (before === undefined && after !== undefined) published.push(date);
      else if (before !== after) changed.push(date);
    }
    if (published.length > 0) events.push({ type: 'published', dates: published });
    if (changed.length > 0) events.push({ type: 'changed', dates: changed });

    for (const [startDate, term] of Object.entries(next.terms).sort(([a], [b]) => a.localeCompare(b))) {
      if (prev.terms[startDate] || term.submitted) continue;
      events.push({ type: 'term-opened', startDate, endDate: term.endDate, submitEndAt: term.submitEndAt });
    }
  }

  // 一覧から消えた期間の印は捨て、残っている期間の印だけを引き継ぐ
  const notified = (prev?.notifiedDeadlines ?? []).filter((startDate) => next.terms[startDate]);
  for (const [startDate, term] of Object.entries(next.terms).sort(([a], [b]) => a.localeCompare(b))) {
    if (notified.includes(startDate) || !isDeadlineNear(term, now)) continue;
    events.push({ type: 'deadline', startDate, endDate: term.endDate, submitEndAt: term.submitEndAt });
    notified.push(startDate);
  }

  return { events, snapshot: { ...next, notifiedDeadlines: notified } };
}

function formatDates(dates: string[]): string {
  const listed = dates.slice(0, MAX_LISTED_DATES).map(formatMonthDayWithWeekday).join('、');
  const rest = dates.length - MAX_LISTED_DATES;
  return rest > 0 ? `${listed}ほか${rest}日` : listed;
}

/** "2026-11-25T23:59:00.000+09:00" → "11/25 23:59"（端末の時刻で表す） */
function formatDeadline(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${date.getMonth() + 1}/${date.getDate()} ${hh}:${mm}`;
}

function formatTerm(startDate: string, endDate: string): string {
  return `${formatMonthDayWithWeekday(startDate)}〜${formatMonthDayWithWeekday(endDate)}`;
}

/** 出来事を通知の文言にする（1件の出来事につき1通） */
export function formatShiftNotifications(events: ShiftEvent[]): ShiftNotificationContent[] {
  return events.map((event) => {
    switch (event.type) {
      case 'published':
        return { title: '確定シフトが出ました', body: formatDates(event.dates), target: 'calendar' };
      case 'changed':
        return { title: 'シフトが変更されました', body: formatDates(event.dates), target: 'calendar' };
      case 'term-opened':
        return {
          title: '希望シフトの提出が始まりました',
          body: `${formatTerm(event.startDate, event.endDate)}の希望を ${formatDeadline(event.submitEndAt)} までに提出してください`,
          target: 'submit',
        };
      case 'deadline':
        return {
          title: '希望シフトの提出期限が近づいています',
          body: `${formatTerm(event.startDate, event.endDate)}がまだ未提出です（期限 ${formatDeadline(event.submitEndAt)}）`,
          target: 'submit',
        };
    }
  });
}
