import type { SalaryResult } from '../types/shift';

interface SalarySummaryProps {
  result: SalaryResult;
}

function formatYen(amount: number): string {
  return amount.toLocaleString('ja-JP');
}

function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}時間`;
  return `${h}時間${m}分`;
}

export function SalarySummary({ result }: SalarySummaryProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
      <h2 className="text-lg font-bold text-gray-800">給料見込み</h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 rounded-xl p-4">
          <p className="text-xs text-blue-600 font-medium">出勤日数</p>
          <p className="text-2xl font-bold text-blue-800">{result.totalWorkDays}日</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4">
          <p className="text-xs text-blue-600 font-medium">総勤務時間</p>
          <p className="text-2xl font-bold text-blue-800">{formatHours(result.totalHours)}</p>
        </div>
      </div>

      <div className="space-y-2 pt-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">
            通常給 ({formatHours(result.totalNormalHours)})
          </span>
          <span className="font-medium text-gray-800">{formatYen(result.normalPay)}円</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-purple-600">
            深夜割増 ({formatHours(result.totalLateNightHours)}, x1.25)
          </span>
          <span className="font-medium text-purple-700">{formatYen(result.lateNightPay)}円</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">
            交通費 ({result.totalWorkDays}日分)
          </span>
          <span className="font-medium text-gray-800">{formatYen(result.transportTotal)}円</span>
        </div>
        <div className="border-t border-gray-200 pt-3 mt-3">
          <div className="flex justify-between">
            <span className="text-base font-bold text-gray-800">合計</span>
            <span className="text-2xl font-bold text-green-600">{formatYen(result.totalPay)}円</span>
          </div>
        </div>
      </div>
    </div>
  );
}
