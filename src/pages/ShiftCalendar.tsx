import { useState, useEffect, useMemo } from 'react';
import { useShifts } from '../hooks/useShifts';
import { CalendarGrid } from '../components/CalendarGrid';
import { CalendarDayDetail, CALENDAR_DAY_DETAIL_HEADING_ID } from '../components/CalendarDayDetail';
import { buildShiftsByDate, defaultSelectedDate, shiftMonth, toDateString } from '../utils/calendar';

interface ShiftCalendarProps {
  onSessionExpired: () => void;
}

export function ShiftCalendar({ onSessionExpired }: ShiftCalendarProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return defaultSelectedDate(today.getFullYear(), today.getMonth() + 1, today);
  });
  // useShifts の loading は取得開始（useEffect）まで false のため、月移動直後の
  // 1フレームだけ前月のデータを参照してしまう。月を変えた時点で立てて取得完了で下ろす。
  const [pending, setPending] = useState(true);
  const { schedules, loading, error, fetchShifts } = useShifts(onSessionExpired);

  useEffect(() => {
    let active = true;
    fetchShifts(year, month).finally(() => {
      if (active) setPending(false);
    });
    return () => {
      active = false;
    };
  }, [year, month, fetchShifts]);

  const handleMoveMonth = (delta: number) => {
    const next = shiftMonth(year, month, delta);
    setPending(true);
    setYear(next.year);
    setMonth(next.month);
    setSelectedDate(defaultSelectedDate(next.year, next.month, new Date()));
  };

  const shiftsByDate = useMemo(() => buildShiftsByDate(schedules), [schedules]);
  const todayDate = toDateString(now);
  const isLoading = loading || pending;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-3 sm:p-4" aria-busy={isLoading}>
        <CalendarGrid
          year={year}
          month={month}
          shiftsByDate={shiftsByDate}
          selectedDate={selectedDate}
          todayDate={todayDate}
          onSelectDate={setSelectedDate}
          onPrevMonth={() => handleMoveMonth(-1)}
          onNextMonth={() => handleMoveMonth(1)}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* live region は常設し、中身だけを差し替える（月移動のたびに再マウントさせない） */}
      <section
        aria-labelledby={CALENDAR_DAY_DETAIL_HEADING_ID}
        aria-live="polite"
        className="space-y-3"
      >
        {!error && (
          <CalendarDayDetail
            date={selectedDate}
            shifts={shiftsByDate.get(selectedDate) ?? []}
            loading={isLoading}
          />
        )}
      </section>
    </div>
  );
}
