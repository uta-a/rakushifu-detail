import type { ShiftUpsertItem } from '../types/shift.ts';

export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
/** 提出期間は半月単位。2ヶ月ぶんを上限にして、巨大なボディを上流へ中継しない */
export const MAX_SHIFTS = 62;
const MAX_MEMO_LENGTH = 500;
/** 日跨ぎの終了時刻を許すため 24 時を超える値も受ける */
const MAX_HOUR = 47;
/** off_type は Default(0) 〜 PmOff(5) */
const MAX_OFF_TYPE = 5;

function isIntInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

/**
 * リクエストボディを検証し、上流へ送る形に組み直す。
 * 受け取った値をそのまま中継すると任意の JSON をらくしふへ送れてしまうため、
 * 検証を通った値だけで新しいオブジェクトを作る（spread は使わない）。
 */
export function sanitizeShifts(raw: unknown): { items: ShiftUpsertItem[] } | { error: string } {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_SHIFTS) {
    return { error: `提出する日数が不正です（1〜${MAX_SHIFTS}日）` };
  }

  const items: ShiftUpsertItem[] = [];
  const seen = new Set<string>();

  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) {
      return { error: '提出内容が不正です' };
    }
    const shift = entry as Record<string, unknown>;

    const date = shift.date;
    if (typeof date !== 'string' || !DATE_PATTERN.test(date)) {
      return { error: '日付の形式が不正です' };
    }
    if (seen.has(date)) {
      return { error: `日付が重複しています: ${date}` };
    }
    seen.add(date);

    const memo = shift.memo_text ?? null;
    if (memo !== null && (typeof memo !== 'string' || memo.length > MAX_MEMO_LENGTH)) {
      return { error: `メモは${MAX_MEMO_LENGTH}文字以内で入力してください` };
    }

    const fixedShiftLogId = shift.fixed_shift_log_id ?? null;
    if (fixedShiftLogId !== null && !isIntInRange(fixedShiftLogId, 1, 9_999_999_999)) {
      return { error: '確定シフトの指定が不正です' };
    }

    const desired = shift.desired_schedule ?? null;

    // 確定済みの日を書き換えるリクエストは、UI で弾いていてもサーバー側で拒否する
    if (fixedShiftLogId !== null && desired !== null) {
      return { error: '確定済みの日は変更できません' };
    }

    if (desired === null) {
      items.push({ date, memo_text: memo, fixed_shift_log_id: fixedShiftLogId, desired_schedule: null });
      continue;
    }
    if (typeof desired !== 'object') {
      return { error: '希望内容が不正です' };
    }
    const d = desired as Record<string, unknown>;

    if (!isIntInRange(d.attending_store_id, 1, 9_999_999)) {
      return { error: '勤務店舗が不正です' };
    }
    if (!isIntInRange(d.attending_genre_id, 0, 9_999_999)) {
      return { error: '職種が不正です' };
    }
    if (!isIntInRange(d.start_hour, 0, MAX_HOUR) || !isIntInRange(d.end_hour, 0, MAX_HOUR)) {
      return { error: '時刻（時）が不正です' };
    }
    if (!isIntInRange(d.start_minute, 0, 59) || !isIntInRange(d.end_minute, 0, 59)) {
      return { error: '時刻（分）が不正です' };
    }
    if (typeof d.off !== 'boolean') {
      return { error: '休み希望の指定が不正です' };
    }
    if (!isIntInRange(d.off_type, 0, MAX_OFF_TYPE)) {
      return { error: '休みの種別が不正です' };
    }

    items.push({
      date,
      memo_text: memo,
      fixed_shift_log_id: null,
      desired_schedule: {
        attending_store_id: d.attending_store_id,
        attending_genre_id: d.attending_genre_id,
        start_hour: d.start_hour,
        start_minute: d.start_minute,
        end_hour: d.end_hour,
        end_minute: d.end_minute,
        off: d.off,
        off_type: d.off_type,
      },
    });
  }

  return { items };
}
