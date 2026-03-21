import type { ShiftDetail } from '../types/shift';

interface ShiftTableProps {
  shifts: ShiftDetail[];
}

const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
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

function getDayColor(dateStr: string): string {
  const day = new Date(dateStr).getDay();
  if (day === 0) return 'text-red-500';
  if (day === 6) return 'text-blue-500';
  return 'text-gray-800';
}

export function ShiftTable({ shifts }: ShiftTableProps) {
  if (shifts.length === 0) {
    return <p className="text-gray-500 text-center py-8">シフトデータがありません</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-gray-200">
            <th className="py-2 px-3 text-left font-medium text-gray-600">日付</th>
            <th className="py-2 px-3 text-left font-medium text-gray-600">時間</th>
            <th className="py-2 px-3 text-right font-medium text-gray-600">勤務</th>
            <th className="py-2 px-3 text-right font-medium text-gray-600">通常</th>
            <th className="py-2 px-3 text-right font-medium text-gray-600">深夜</th>
          </tr>
        </thead>
        <tbody>
          {shifts.map((shift) => (
            <tr
              key={shift.date}
              className={`border-b border-gray-100 ${shift.isOff ? 'bg-gray-50 opacity-60' : 'hover:bg-blue-50'}`}
            >
              <td className={`py-2 px-3 font-medium ${getDayColor(shift.date)}`}>
                {formatDate(shift.date)}
              </td>
              <td className="py-2 px-3 text-gray-700">
                {shift.isOff ? (
                  <span className="text-gray-400">休み</span>
                ) : (
                  `${shift.startTime} - ${shift.endTime}`
                )}
              </td>
              <td className="py-2 px-3 text-right text-gray-700">
                {shift.isOff ? '-' : formatHours(shift.totalHours)}
              </td>
              <td className="py-2 px-3 text-right text-gray-700">
                {shift.isOff ? '-' : formatHours(shift.normalHours)}
              </td>
              <td className="py-2 px-3 text-right text-purple-600 font-medium">
                {shift.isOff || shift.lateNightHours === 0
                  ? '-'
                  : formatHours(shift.lateNightHours)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
