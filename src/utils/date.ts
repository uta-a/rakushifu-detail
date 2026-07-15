/**
 * "YYYY-MM-DD" をローカルタイムの Date として解釈する。
 * new Date("YYYY-MM-DD") は UTC 解釈のため、UTC より西のタイムゾーンでは
 * 日付が前日にずれる。年月日を明示して構築することでずれを防ぐ。
 */
export function parseShiftDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}
