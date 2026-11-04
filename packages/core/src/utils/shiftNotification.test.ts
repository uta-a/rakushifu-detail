import { describe, it, expect } from 'vitest';
import {
  buildShiftSnapshot,
  diffShiftSnapshots,
  formatShiftNotifications,
  DEADLINE_NOTICE_HOURS,
  type ShiftSnapshot,
} from './shiftNotification.ts';
import type { Schedule, SubmitTerm } from '../types/shift.ts';

function schedule(o: Partial<Schedule> & { id: number; date: string }): Schedule {
  return {
    start_hour: 17,
    start_minute: 0,
    end_hour: 22,
    end_minute: 0,
    off: false,
    off_type: '',
    rest_times: null,
    memo_text: null,
    attending_store_id: 1,
    attending_genre_id: 2,
    belonging_store_id: 1,
    belonging_genre_id: 2,
    shared_schedule_store_tasks: [],
    ...o,
  };
}

function term(o: Partial<SubmitTerm> & { start_date: string; end_date: string }): SubmitTerm {
  return {
    user_id: 1,
    store_id: 1,
    submit_end_at: '2026-11-25T23:59:00.000+09:00',
    submitted: false,
    ...o,
  };
}

const NOW = new Date('2026-11-05T12:00:00+09:00');
const MONTHS = ['2026-11', '2026-12'];

function snapshot(schedules: Schedule[], terms: SubmitTerm[] = [], months = MONTHS): ShiftSnapshot {
  return buildShiftSnapshot({ months, schedules, terms });
}

describe('buildShiftSnapshot', () => {
  it('日付ごとに勤務時間を文字列にし、休みは off にする', () => {
    const snap = snapshot([
      schedule({ id: 1, date: '2026-11-10' }),
      schedule({ id: 2, date: '2026-11-11', off: true, start_hour: null, end_hour: null }),
    ]);
    expect(snap.shifts).toEqual({ '2026-11-10': '17:00-22:00', '2026-11-11': 'off' });
  });

  it('1日に複数のシフトがあれば開始時刻順に並べてつなぐ', () => {
    const snap = snapshot([
      schedule({ id: 2, date: '2026-11-10', start_hour: 18, end_hour: 22 }),
      schedule({ id: 1, date: '2026-11-10', start_hour: 10, end_hour: 14 }),
    ]);
    expect(snap.shifts['2026-11-10']).toBe('10:00-14:00,18:00-22:00');
  });

  it('日跨ぎの終了時刻（24時以降）もそのまま持つ', () => {
    const snap = snapshot([schedule({ id: 1, date: '2026-11-10', start_hour: 22, end_hour: 26, end_minute: 30 })]);
    expect(snap.shifts['2026-11-10']).toBe('22:00-26:30');
  });

  it('提出期間は開始日をキーに、締切と提出済みかを持つ', () => {
    const snap = snapshot([], [term({ start_date: '2026-12-01', end_date: '2026-12-15', submitted: true })]);
    expect(snap.terms).toEqual({
      '2026-12-01': { endDate: '2026-12-15', submitEndAt: '2026-11-25T23:59:00.000+09:00', submitted: true },
    });
  });
});

describe('diffShiftSnapshots', () => {
  it('前回が無ければ（初回）通知せず、基準として保存するだけにする', () => {
    const next = snapshot([schedule({ id: 1, date: '2026-11-10' })], [term({ start_date: '2026-12-01', end_date: '2026-12-15' })]);
    const { events } = diffShiftSnapshots(null, next, NOW);
    expect(events).toEqual([]);
  });

  it('初回でも、未提出で締切が近い期間は通知する', () => {
    const next = snapshot(
      [],
      [term({ start_date: '2026-12-01', end_date: '2026-12-15', submit_end_at: '2026-11-06T09:00:00.000+09:00' })],
    );
    const { events } = diffShiftSnapshots(null, next, NOW);
    expect(events).toEqual([{ type: 'deadline', startDate: '2026-12-01', endDate: '2026-12-15', submitEndAt: '2026-11-06T09:00:00.000+09:00' }]);
  });

  it('新しく出たシフトの日を published で返す', () => {
    const prev = snapshot([schedule({ id: 1, date: '2026-11-10' })]);
    const next = snapshot([
      schedule({ id: 1, date: '2026-11-10' }),
      schedule({ id: 2, date: '2026-11-20' }),
      schedule({ id: 3, date: '2026-12-02' }),
    ]);
    const { events } = diffShiftSnapshots(prev, next, NOW);
    expect(events).toEqual([{ type: 'published', dates: ['2026-11-20', '2026-12-02'] }]);
  });

  it('時刻が変わった日・休みになった日・消えた日を changed で返す', () => {
    const prev = snapshot([
      schedule({ id: 1, date: '2026-11-10' }),
      schedule({ id: 2, date: '2026-11-11' }),
      schedule({ id: 3, date: '2026-11-12' }),
      schedule({ id: 4, date: '2026-11-13' }),
    ]);
    const next = snapshot([
      schedule({ id: 1, date: '2026-11-10', start_hour: 18 }),
      schedule({ id: 2, date: '2026-11-11', off: true }),
      schedule({ id: 4, date: '2026-11-13' }),
    ]);
    const { events } = diffShiftSnapshots(prev, next, NOW);
    expect(events).toEqual([{ type: 'changed', dates: ['2026-11-10', '2026-11-11', '2026-11-12'] }]);
  });

  it('今日より前の日の差分は通知しない', () => {
    const prev = snapshot([schedule({ id: 1, date: '2026-11-03' })]);
    const next = snapshot([schedule({ id: 1, date: '2026-11-03', start_hour: 18 }), schedule({ id: 2, date: '2026-11-04' })]);
    expect(diffShiftSnapshots(prev, next, NOW).events).toEqual([]);
  });

  it('前回取っていなかった月（月が変わって新しく対象になった月）は、黙って基準にする', () => {
    const prev = snapshot([schedule({ id: 1, date: '2026-11-10' })], [], ['2026-10', '2026-11']);
    const next = snapshot([schedule({ id: 1, date: '2026-11-10' }), schedule({ id: 2, date: '2026-12-05' })]);
    expect(diffShiftSnapshots(prev, next, NOW).events).toEqual([]);
  });

  it('未提出の新しい提出期間を term-opened で返す。提出済みなら返さない', () => {
    const prev = snapshot([], [term({ start_date: '2026-11-16', end_date: '2026-11-30', submitted: true })]);
    const next = snapshot(
      [],
      [
        term({ start_date: '2026-11-16', end_date: '2026-11-30', submitted: true }),
        term({ start_date: '2026-12-01', end_date: '2026-12-15' }),
        term({ start_date: '2026-12-16', end_date: '2026-12-31', submitted: true }),
      ],
    );
    expect(diffShiftSnapshots(prev, next, NOW).events).toEqual([
      { type: 'term-opened', startDate: '2026-12-01', endDate: '2026-12-15', submitEndAt: '2026-11-25T23:59:00.000+09:00' },
    ]);
  });

  it(`未提出で締切まで ${DEADLINE_NOTICE_HOURS} 時間を切った期間を、一度だけ deadline で返す`, () => {
    const soon = term({ start_date: '2026-12-01', end_date: '2026-12-15', submit_end_at: '2026-11-06T11:00:00.000+09:00' });
    const prev = snapshot([], [soon]);
    const next = snapshot([], [soon]);

    const first = diffShiftSnapshots(prev, next, NOW);
    expect(first.events.map((e) => e.type)).toEqual(['deadline']);
    expect(first.snapshot.notifiedDeadlines).toEqual(['2026-12-01']);

    // 通知済みの印を引き継いだ次の確認では、もう出さない
    const again = diffShiftSnapshots(first.snapshot, snapshot([], [soon]), new Date('2026-11-05T13:00:00+09:00'));
    expect(again.events).toEqual([]);
    expect(again.snapshot.notifiedDeadlines).toEqual(['2026-12-01']);
  });

  it('締切まで余裕がある・提出済み・締切を過ぎた期間は deadline を返さない', () => {
    const terms = [
      term({ start_date: '2026-12-01', end_date: '2026-12-15', submit_end_at: '2026-11-07T12:00:01.000+09:00' }),
      term({ start_date: '2026-12-16', end_date: '2026-12-31', submit_end_at: '2026-11-06T09:00:00.000+09:00', submitted: true }),
      term({ start_date: '2026-11-16', end_date: '2026-11-30', submit_end_at: '2026-11-05T11:59:00.000+09:00' }),
    ];
    const prev = snapshot([], terms);
    expect(diffShiftSnapshots(prev, snapshot([], terms), NOW).events).toEqual([]);
  });

  it('提出期間の一覧から消えた期間の通知済みの印は捨てる', () => {
    const prev: ShiftSnapshot = { ...snapshot([]), notifiedDeadlines: ['2026-10-16', '2026-12-01'] };
    const next = snapshot([], [term({ start_date: '2026-12-01', end_date: '2026-12-15', submitted: true })]);
    expect(diffShiftSnapshots(prev, next, NOW).snapshot.notifiedDeadlines).toEqual(['2026-12-01']);
  });
});

describe('formatShiftNotifications', () => {
  it('種類ごとに1件の文言にし、行き先のタブを付ける', () => {
    const notes = formatShiftNotifications([
      { type: 'published', dates: ['2026-11-20', '2026-12-02'] },
      { type: 'changed', dates: ['2026-11-10'] },
      { type: 'term-opened', startDate: '2026-12-01', endDate: '2026-12-15', submitEndAt: '2026-11-25T23:59:00.000+09:00' },
      { type: 'deadline', startDate: '2026-12-01', endDate: '2026-12-15', submitEndAt: '2026-11-06T11:00:00.000+09:00' },
    ]);
    expect(notes).toEqual([
      { title: '確定シフトが出ました', body: '11/20（金）、12/2（水）', target: 'calendar' },
      { title: 'シフトが変更されました', body: '11/10（火）', target: 'calendar' },
      {
        title: '希望シフトの提出が始まりました',
        body: '12/1（火）〜12/15（火）の希望を 11/25 23:59 までに提出してください',
        target: 'submit',
      },
      {
        title: '希望シフトの提出期限が近づいています',
        body: '12/1（火）〜12/15（火）がまだ未提出です（期限 11/6 11:00）',
        target: 'submit',
      },
    ]);
  });

  it('日付が多いときは先頭3日と残りの日数にする', () => {
    const [note] = formatShiftNotifications([
      { type: 'published', dates: ['2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23', '2026-11-24'] },
    ]);
    expect(note.body).toBe('11/20（金）、11/21（土）、11/22（日）ほか2日');
  });
});
