import { CalendarOff, Moon, StickyNote } from 'lucide-react';
import type { CalendarShift } from '../types/shift';
import { formatMonthDayWithWeekday } from '../utils/calendar';
import { Card, CardContent } from './ui/card';
import { Skeleton, SkeletonGroup } from './ui/skeleton';
import { Badge } from './ui/badge';
import { cn } from '../lib/cn';

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

/** 内訳1行。意味色はラベルと値の両方に掛ける */
function DetailRow({
  label,
  value,
  tone,
}: {
  label: React.ReactNode;
  value: string;
  tone?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3 text-sm', tone)}>
      <dt className={cn('flex items-center gap-1.5', tone ? 'opacity-90' : 'text-muted-foreground')}>
        {label}
      </dt>
      <dd className="tabular font-medium">{value}</dd>
    </div>
  );
}

/** 中身が無いときの共通の枠。取得中と「シフトなし」で高さを揃える */
function EmptyCard({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex min-h-32 flex-col items-center justify-center gap-2 text-center">
        {children}
      </CardContent>
    </Card>
  );
}

export function CalendarDayDetail({ date, shifts, loading }: CalendarDayDetailProps) {
  return (
    <>
      <h2 id={CALENDAR_DAY_DETAIL_HEADING_ID} className="text-base font-semibold tracking-tight">
        {formatMonthDayWithWeekday(date)}
      </h2>

      {/* 取得中は「シフトなし」を出さない（前月のデータでちらつかせない） */}
      {loading && (
        <Card>
          <CardContent>
            <SkeletonGroup label="シフトデータを取得中" className="min-h-32 space-y-3">
              <Skeleton className="h-8 w-40" />
              <div className="space-y-2 pl-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            </SkeletonGroup>
          </CardContent>
        </Card>
      )}

      {!loading && shifts.length === 0 && (
        <EmptyCard>
          <CalendarOff className="text-muted-foreground size-6" aria-hidden="true" />
          <p className="text-muted-foreground text-sm">この日のシフトはありません</p>
        </EmptyCard>
      )}

      {!loading &&
        shifts.map(({ schedule, detail }, index) => {
          const memo = schedule.memo_text?.trim();
          return (
            <Card key={`${schedule.id}-${index}`}>
              <CardContent className="space-y-4">
                {detail.isOff ? (
                  <p className="text-muted-foreground flex items-center gap-2 text-base font-medium">
                    <Moon className="size-4" aria-hidden="true" />
                    休み
                  </p>
                ) : (
                  <div className="space-y-3">
                    <p className="tabular text-2xl font-semibold tracking-tight">
                      {detail.startTime} <span className="text-muted-foreground">–</span>{' '}
                      {detail.endTime}
                    </p>
                    {/* 時刻の下に縦線を通し、その日の内訳をぶら下げる */}
                    <dl className="border-work ml-1 space-y-2 border-l-2 pl-4">
                      <DetailRow
                        label="勤務時間"
                        value={formatHours(detail.totalHours)}
                        tone="text-work"
                      />
                      <DetailRow
                        label="通常"
                        value={formatHours(detail.normalHours)}
                        tone="text-work"
                      />
                      <DetailRow
                        label={
                          <>
                            <Moon className="size-3.5" aria-hidden="true" />
                            深夜
                            {detail.lateNightHours > 0 && (
                              <Badge variant="outline">×1.25</Badge>
                            )}
                          </>
                        }
                        value={
                          detail.lateNightHours === 0 ? 'なし' : formatHours(detail.lateNightHours)
                        }
                        tone={detail.lateNightHours > 0 ? 'text-late-night' : undefined}
                      />
                    </dl>
                  </div>
                )}

                {memo && (
                  <p className="text-muted-foreground flex items-start gap-2 border-t pt-3 text-sm">
                    <StickyNote className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    {memo}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
    </>
  );
}
