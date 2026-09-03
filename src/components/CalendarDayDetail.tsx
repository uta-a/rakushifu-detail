import type { CalendarShift } from '../types/shift';
import { formatMonthDayWithWeekday } from '../utils/calendar';

interface CalendarDayDetailProps {
  date: string;
  shifts: CalendarShift[];
  loading: boolean;
}

/** live region（ShiftCalendar 側の section）から参照する見出しのid */
export const CALENDAR_DAY_DETAIL_HEADING_ID = 'calendar-day-detail-heading';

function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}時間`;
  return `${h}時間${m}分`;
}

export function CalendarDayDetail({ date, shifts, loading }: CalendarDayDetailProps) {
  return (
    <>
      <h2 id={CALENDAR_DAY_DETAIL_HEADING_ID} className="text-lg font-bold text-gray-800">
        {formatMonthDayWithWeekday(date)}
      </h2>

      {/* 取得中は「シフトなし」を出さない（前月のデータでちらつかせない） */}
      {loading && (
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 text-center space-y-2">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
          <p className="text-sm text-gray-500">シフトデータを取得中...</p>
        </div>
      )}

      {!loading && shifts.length === 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 text-center space-y-2">
          <span className="material-symbols-outlined text-4xl text-gray-300">event_busy</span>
          <p className="text-sm text-gray-500">シフトなし</p>
        </div>
      )}

      {!loading &&
        shifts.map(({ schedule, detail }, index) => {
          const memo = schedule.memo_text?.trim();
          return (
            <div
              key={`${schedule.id}-${index}`}
              className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 space-y-3"
            >
              {detail.isOff ? (
                <p className="flex items-center gap-2 text-base font-bold text-gray-500">
                  <span className="material-symbols-outlined text-gray-400">bedtime</span>
                  休み
                </p>
              ) : (
                <>
                  <p className="flex items-center gap-2 text-xl font-bold text-gray-800">
                    <span className="material-symbols-outlined text-blue-600">schedule</span>
                    {detail.startTime} – {detail.endTime}
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">勤務時間</span>
                      <span className="font-medium text-gray-800">{formatHours(detail.totalHours)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">通常</span>
                      <span className="font-medium text-gray-800">{formatHours(detail.normalHours)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-purple-600">深夜</span>
                      <span className="font-medium text-purple-700">
                        {detail.lateNightHours === 0 ? '-' : formatHours(detail.lateNightHours)}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {memo && (
                <p className="flex items-start gap-2 border-t border-gray-100 pt-3 text-sm text-gray-600">
                  <span className="material-symbols-outlined text-base text-gray-400">sticky_note_2</span>
                  {memo}
                </p>
              )}
            </div>
          );
        })}
    </>
  );
}
