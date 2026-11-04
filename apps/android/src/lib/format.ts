import { RakushifuError } from '@rakushifu/core';

/** 7.5 → "7時間30分"（Web版の CalendarDayDetail と同じ表記） */
export function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}時間`;
  return `${h}時間${m}分`;
}

/** 0時起点の分 → "HH:MM"。日跨ぎ（1440 以上）は翌日の時刻に折り返す */
export function formatMin(min: number): string {
  const normalized = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * 画面に出すエラー文言。RakushifuError の message は利用者に見せてよい文言だけなので
 * そのまま使い、それ以外（想定外の例外）は中身を出さずに fallback にする。
 */
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof RakushifuError ? error.message : fallback;
}

/** 1234 → "1,234" */
export function formatYen(amount: number): string {
  return amount.toLocaleString('ja-JP');
}
