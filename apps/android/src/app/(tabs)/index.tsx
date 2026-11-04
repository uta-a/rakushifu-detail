import { useMemo, useState } from 'react';
import { buildShiftsByDate, defaultSelectedDate, shiftMonth, toDateString } from '@rakushifu/core';
import { useConfirmedShifts } from '@/hooks/useConfirmedShifts';
import { CalendarDayDetail } from '@/components/calendar/CalendarDayDetail';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { DayOverlap } from '@/components/calendar/DayOverlap';
import { MonthNav } from '@/components/MonthNav';
import { Screen } from '@/components/Screen';
import { Alert } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { errorMessage } from '@/lib/format';
import { space } from '@/theme/tokens';

/** 月グリッド + 選択日の詳細 + その日のかぶり（Web版の ShiftCalendar） */
export default function CalendarScreen() {
  const [{ year, month }, setYearMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const [selectedDate, setSelectedDate] = useState(() => defaultSelectedDate(year, month, new Date()));
  const { data, error, isPending } = useConfirmedShifts(year, month);

  const handleMove = (delta: number) => {
    const next = shiftMonth(year, month, delta);
    setYearMonth(next);
    setSelectedDate(defaultSelectedDate(next.year, next.month, new Date()));
  };

  const shiftsByDate = useMemo(() => buildShiftsByDate(data ?? []), [data]);
  const todayDate = toDateString(new Date());

  // かぶりを出すのは出勤する日だけ。店舗はその日のシフトから取れるので再取得も要らない
  const selectedWorkShift = shiftsByDate.get(selectedDate)?.find((entry) => !entry.detail.isOff);
  const overlapStoreId = selectedWorkShift ? selectedWorkShift.schedule.attending_store_id : null;

  return (
    <Screen>
      <Card>
        {/* カレンダーだけ余白を詰める（Web の p-2） */}
        <CardContent padding="none" style={{ padding: space[2], gap: space[1] }}>
          <MonthNav year={year} month={month} onMove={handleMove} />
          <CalendarGrid
            year={year}
            month={month}
            shiftsByDate={shiftsByDate}
            selectedDate={selectedDate}
            todayDate={todayDate}
            onSelectDate={setSelectedDate}
          />
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive">{errorMessage(error, 'シフトデータの取得でエラーが発生しました')}</Alert>
      ) : (
        <>
          <CalendarDayDetail date={selectedDate} shifts={shiftsByDate.get(selectedDate) ?? []} loading={isPending} />
          <DayOverlap date={selectedDate} storeId={overlapStoreId} />
        </>
      )}
    </Screen>
  );
}
