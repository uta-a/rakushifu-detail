import type { SalaryResult } from '../types/shift';
import { Card, CardContent, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

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

/** 内訳1行。ラベルは muted、値は前面色に揃える（行ごとに色を変えない） */
function BreakdownRow({
  label,
  sub,
  value,
}: {
  label: string;
  sub?: React.ReactNode;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-sm">
      <dt className="text-muted-foreground flex min-w-0 items-center gap-2">
        <span className="truncate">{label}</span>
        {sub}
      </dt>
      <dd className="tabular shrink-0 font-medium">{value}</dd>
    </div>
  );
}

export function SalarySummary({ result }: SalarySummaryProps) {
  return (
    <Card>
      <CardContent className="space-y-5">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium">給料見込み</CardTitle>
          <p className="tabular text-4xl font-semibold tracking-tight">
            {formatYen(result.totalPay)}
            <span className="text-muted-foreground ml-1 text-xl font-normal">円</span>
          </p>
        </div>

        <dl className="grid grid-cols-2 overflow-hidden rounded-lg border">
          <div className="space-y-1 border-r p-3">
            <dt className="text-muted-foreground text-xs">出勤日数</dt>
            <dd className="tabular text-xl font-semibold">{result.totalWorkDays}日</dd>
          </div>
          <div className="space-y-1 p-3">
            <dt className="text-muted-foreground text-xs">総勤務時間</dt>
            <dd className="tabular text-xl font-semibold">{formatHours(result.totalHours)}</dd>
          </div>
        </dl>

        <dl className="divide-y border-t pt-1">
          <BreakdownRow
            label={`通常給（${formatHours(result.totalNormalHours)}）`}
            value={`${formatYen(result.normalPay)}円`}
          />
          <BreakdownRow
            label={`深夜割増（${formatHours(result.totalLateNightHours)}）`}
            sub={<Badge variant="outline">×1.25</Badge>}
            value={`${formatYen(result.lateNightPay)}円`}
          />
          <BreakdownRow
            label={`交通費（${result.totalWorkDays}日分）`}
            value={`${formatYen(result.transportTotal)}円`}
          />
        </dl>
      </CardContent>
    </Card>
  );
}
