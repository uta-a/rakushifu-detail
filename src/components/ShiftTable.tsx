import type { ShiftDetail } from '../types/shift';
import { parseShiftDate } from '../utils/date';
import { cn } from '../lib/cn';

interface ShiftTableProps {
  shifts: ShiftDetail[];
}

const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'];

function formatDate(dateStr: string): string {
  const date = parseShiftDate(dateStr);
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const dow = dayOfWeek[date.getDay()];
  return `${m}/${d}(${dow})`;
}

function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h${m}m`;
}

/** 曜日色は日・土のみ。それ以外は前面色に揃える */
function getDayColor(dateStr: string): string {
  const day = parseShiftDate(dateStr).getDay();
  if (day === 0) return 'text-sunday';
  if (day === 6) return 'text-saturday';
  return 'text-foreground';
}

/** 空欄。記号は読み上げから外し、代わりに「なし」を読ませる */
function Blank() {
  return (
    <>
      <span className="text-muted-foreground font-normal" aria-hidden="true">
        –
      </span>
      <span className="sr-only">なし</span>
    </>
  );
}

export function ShiftTable({ shifts }: ShiftTableProps) {
  if (shifts.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">シフトデータがありません</p>
    );
  }

  return (
    <div className="-mx-4 overflow-x-auto sm:-mx-6">
      <table className="tabular w-full min-w-[22rem] text-sm whitespace-nowrap">
        <thead>
          <tr className="border-b">
            <th className="text-muted-foreground px-4 py-2 text-left font-medium sm:px-6">日付</th>
            <th className="text-muted-foreground px-2 py-2 text-left font-medium">時間</th>
            <th className="text-muted-foreground px-2 py-2 text-right font-medium">勤務</th>
            <th className="text-muted-foreground px-2 py-2 text-right font-medium">通常</th>
            <th className="text-muted-foreground px-4 py-2 text-right font-medium sm:px-6">深夜</th>
          </tr>
        </thead>
        <tbody>
          {shifts.map((shift) => (
            <tr
              key={shift.date}
              className={cn(
                'border-b last:border-0',
                shift.isOff ? 'bg-muted/40' : 'hover:bg-muted/50 transition-colors duration-150'
              )}
            >
              <td
                className={cn(
                  'px-4 py-2.5 font-medium sm:px-6',
                  shift.isOff ? 'text-muted-foreground' : getDayColor(shift.date)
                )}
              >
                {formatDate(shift.date)}
              </td>
              <td className="text-muted-foreground px-2 py-2.5">
                {shift.isOff ? '休み' : `${shift.startTime} – ${shift.endTime}`}
              </td>
              <td className="px-2 py-2.5 text-right">
                {shift.isOff ? <Blank /> : formatHours(shift.totalHours)}
              </td>
              <td className="px-2 py-2.5 text-right">
                {shift.isOff ? <Blank /> : formatHours(shift.normalHours)}
              </td>
              <td className="text-late-night px-4 py-2.5 text-right font-medium sm:px-6">
                {shift.isOff || shift.lateNightHours === 0 ? (
                  <Blank />
                ) : (
                  formatHours(shift.lateNightHours)
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
