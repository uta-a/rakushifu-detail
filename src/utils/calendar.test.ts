import { describe, it, expect } from 'vitest';
import {
  buildMonthGrid,
  shiftMonth,
  toDateString,
  buildShiftsByDate,
  getDayMark,
  formatMonthDayWithWeekday,
  defaultSelectedDate,
} from './calendar';
import { parseShiftDate } from './date';
import type { Schedule } from '../types/shift';

function schedule(o: Partial<Schedule> & { id: number; date: string }): Schedule {
  return {
    start_hour: 9,
    start_minute: 0,
    end_hour: 17,
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

function offSchedule(o: { id: number; date: string }): Schedule {
  return schedule({
    ...o,
    off: true,
    start_hour: null,
    start_minute: null,
    end_hour: null,
    end_minute: null,
  });
}

describe('buildMonthGrid', () => {
  it('どの週も必ず7セルになる', () => {
    for (const [year, month] of [[2026, 2], [2025, 3], [2024, 2], [2026, 9]]) {
      for (const week of buildMonthGrid(year, month)) {
        expect(week).toHaveLength(7);
      }
    }
  });

  it('月初が日曜なら先頭にパディングが入らない（2026年2月）', () => {
    const weeks = buildMonthGrid(2026, 2);
    expect(weeks[0][0]).toEqual({ date: '2026-02-01', day: 1 });
  });

  it('28日かつ日曜始まりの月は4週になる（2026年2月）', () => {
    const weeks = buildMonthGrid(2026, 2);
    expect(weeks).toHaveLength(4);
    expect(weeks[3][6]).toEqual({ date: '2026-02-28', day: 28 });
  });

  it('月初が土曜で31日ある月は6週になる（2025年3月）', () => {
    const weeks = buildMonthGrid(2025, 3);
    expect(weeks).toHaveLength(6);
    expect(weeks[0][6]).toEqual({ date: '2025-03-01', day: 1 });
  });

  it('火曜始まりで30日ある月は5週になる（2026年9月）', () => {
    const weeks = buildMonthGrid(2026, 9);
    expect(weeks).toHaveLength(5);
    expect(weeks[0][2]).toEqual({ date: '2026-09-01', day: 1 });
    expect(weeks[4][3]).toEqual({ date: '2026-09-30', day: 30 });
  });

  it('うるう年の2月は29日まで生成する（2024年2月）', () => {
    const days = buildMonthGrid(2024, 2)
      .flat()
      .filter((cell) => cell.day !== null)
      .map((cell) => cell.day);
    expect(days).toHaveLength(29);
    expect(days[28]).toBe(29);
  });

  it('月外のセルは date・day とも null', () => {
    const weeks = buildMonthGrid(2025, 3);
    // 先頭パディング（3/1 は土曜なので日〜金の6セル）
    for (let i = 0; i < 6; i++) {
      expect(weeks[0][i]).toEqual({ date: null, day: null });
    }
    // 末尾パディング（3/31 は月曜なので火〜土の5セル）
    for (let i = 2; i < 7; i++) {
      expect(weeks[5][i]).toEqual({ date: null, day: null });
    }
  });

  it('各列が曜日と一致する（先頭が日曜・末尾が土曜）', () => {
    for (const week of buildMonthGrid(2026, 9)) {
      week.forEach((cell, index) => {
        if (cell.date === null) return;
        expect(parseShiftDate(cell.date).getDay()).toBe(index);
      });
    }
  });

  it('日付はゼロ埋めした YYYY-MM-DD 形式', () => {
    const weeks = buildMonthGrid(2026, 9);
    const dates = weeks.flat().filter((cell) => cell.date !== null).map((cell) => cell.date);
    expect(dates[0]).toBe('2026-09-01');
    expect(dates[8]).toBe('2026-09-09');
    expect(dates[29]).toBe('2026-09-30');
  });
});

describe('shiftMonth', () => {
  it('1月から前月に移ると前年の12月になる', () => {
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });

  it('12月から翌月に移ると翌年の1月になる', () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
  });

  it('年内の移動では年が変わらない', () => {
    expect(shiftMonth(2026, 9, -1)).toEqual({ year: 2026, month: 8 });
    expect(shiftMonth(2026, 9, 1)).toEqual({ year: 2026, month: 10 });
  });
});

describe('toDateString', () => {
  it('1桁の月日もゼロ埋めする', () => {
    expect(toDateString(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('2桁の月日はそのまま並べる', () => {
    expect(toDateString(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('parseShiftDate との往復で元の日付文字列に戻る', () => {
    // 日付文字列の UTC 解釈や toISOString 混入による日付ずれ（コミット dada0a4 の再発）を検出する
    const dates = [
      '2026-01-01',
      '2026-01-31',
      '2026-02-01',
      '2024-02-29',
      '2026-09-09',
      '2026-09-30',
      '2025-12-31',
    ];
    for (const dateStr of dates) {
      expect(toDateString(parseShiftDate(dateStr))).toBe(dateStr);
    }
  });
});

describe('buildShiftsByDate', () => {
  it('同じ日付の複数シフトを1つの配列にまとめる', () => {
    const map = buildShiftsByDate([
      schedule({ id: 1, date: '2026-09-09' }),
      schedule({ id: 2, date: '2026-09-09', start_hour: 18, end_hour: 22 }),
      schedule({ id: 3, date: '2026-09-10' }),
    ]);
    expect(map.get('2026-09-09')).toHaveLength(2);
    expect(map.get('2026-09-10')).toHaveLength(1);
  });

  it('同じ日付の中では開始時刻の昇順に並ぶ', () => {
    const map = buildShiftsByDate([
      schedule({ id: 1, date: '2026-09-09', start_hour: 18, end_hour: 22 }),
      schedule({ id: 2, date: '2026-09-09', start_hour: 9, end_hour: 13 }),
      schedule({ id: 3, date: '2026-09-09', start_hour: 13, start_minute: 30, end_hour: 17 }),
    ]);
    expect(map.get('2026-09-09')?.map((s) => s.schedule.id)).toEqual([2, 3, 1]);
  });

  it('休みは同じ日付の末尾に並ぶ', () => {
    const map = buildShiftsByDate([
      offSchedule({ id: 1, date: '2026-09-09' }),
      schedule({ id: 2, date: '2026-09-09', start_hour: 18, end_hour: 22 }),
    ]);
    expect(map.get('2026-09-09')?.map((s) => s.schedule.id)).toEqual([2, 1]);
  });

  it('終了時刻が無いシフトも休み扱いで末尾に並ぶ', () => {
    const map = buildShiftsByDate([
      schedule({ id: 1, date: '2026-09-09', start_hour: 18, end_hour: 22 }),
      schedule({ id: 2, date: '2026-09-09', start_hour: 9, end_hour: null, end_minute: null }),
      schedule({ id: 3, date: '2026-09-09', start_hour: 13, end_hour: 17 }),
    ]);
    expect(map.get('2026-09-09')?.map((s) => s.schedule.id)).toEqual([3, 1, 2]);
  });

  it('開始時刻が同じならスケジュールidの昇順で並ぶ', () => {
    const map = buildShiftsByDate([
      schedule({ id: 30, date: '2026-09-09', start_hour: 9, end_hour: 13 }),
      schedule({ id: 10, date: '2026-09-09', start_hour: 9, end_hour: 17 }),
      schedule({ id: 20, date: '2026-09-09', start_hour: 9, end_hour: 12 }),
    ]);
    expect(map.get('2026-09-09')?.map((s) => s.schedule.id)).toEqual([10, 20, 30]);
  });

  it('各要素が calcShiftDetail による計算済み詳細を持つ', () => {
    const map = buildShiftsByDate([
      schedule({ id: 1, date: '2026-09-09', start_hour: 21, end_hour: 23 }),
    ]);
    const detail = map.get('2026-09-09')?.[0].detail;
    expect(detail?.startTime).toBe('21:00');
    expect(detail?.endTime).toBe('23:00');
    expect(detail?.totalHours).toBe(2);
    expect(detail?.normalHours).toBe(1);
    expect(detail?.lateNightHours).toBe(1);
    expect(detail?.isOff).toBe(false);
  });

  it('シフトが無ければ空のMapを返す', () => {
    expect(buildShiftsByDate([]).size).toBe(0);
  });
});

describe('getDayMark', () => {
  it('勤務シフトがあれば work', () => {
    const map = buildShiftsByDate([schedule({ id: 1, date: '2026-09-09' })]);
    expect(getDayMark(map.get('2026-09-09'))).toBe('work');
  });

  it('休みだけなら off', () => {
    const map = buildShiftsByDate([offSchedule({ id: 1, date: '2026-09-09' })]);
    expect(getDayMark(map.get('2026-09-09'))).toBe('off');
  });

  it('終了時刻が無いシフトだけの日は off', () => {
    const map = buildShiftsByDate([
      schedule({ id: 1, date: '2026-09-09', start_hour: 9, end_hour: null, end_minute: null }),
    ]);
    expect(getDayMark(map.get('2026-09-09'))).toBe('off');
  });

  it('シフトが無い日（undefined）は none', () => {
    expect(getDayMark(undefined)).toBe('none');
    expect(getDayMark([])).toBe('none');
  });

  it('勤務と休みが混在する日は work', () => {
    const map = buildShiftsByDate([
      offSchedule({ id: 1, date: '2026-09-09' }),
      schedule({ id: 2, date: '2026-09-09' }),
    ]);
    expect(getDayMark(map.get('2026-09-09'))).toBe('work');
  });
});

describe('formatMonthDayWithWeekday', () => {
  it('「9/9（水）」の形式で返す', () => {
    expect(formatMonthDayWithWeekday('2026-09-09')).toBe('9/9（水）');
  });

  it('月初・月末でも日付・曜日がずれない', () => {
    expect(formatMonthDayWithWeekday('2026-09-01')).toBe('9/1（火）');
    expect(formatMonthDayWithWeekday('2026-09-30')).toBe('9/30（水）');
  });

  it('うるう日も正しい曜日で返す', () => {
    expect(formatMonthDayWithWeekday('2024-02-29')).toBe('2/29（木）');
  });
});

describe('defaultSelectedDate', () => {
  it('表示月が今日を含むなら今日を返す', () => {
    expect(defaultSelectedDate(2026, 9, new Date(2026, 8, 9))).toBe('2026-09-09');
  });

  it('今日が月末でも今日を返す', () => {
    expect(defaultSelectedDate(2026, 1, new Date(2026, 0, 31))).toBe('2026-01-31');
  });

  it('表示月が今日を含まないなら月初を返す', () => {
    expect(defaultSelectedDate(2026, 10, new Date(2026, 8, 9))).toBe('2026-10-01');
    expect(defaultSelectedDate(2025, 9, new Date(2026, 8, 9))).toBe('2025-09-01');
  });
});
