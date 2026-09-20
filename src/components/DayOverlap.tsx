import { useEffect } from 'react';
import { AlertCircle, ChefHat, UtensilsCrossed } from 'lucide-react';
import { useOverlap } from '../hooks/useOverlap';
import type { OverlapEntry } from '../types/shift';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Skeleton, SkeletonGroup } from './ui/skeleton';
import { cn } from '../lib/cn';

function formatMin(min: number): string {
  const normalized = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

interface OverlapSectionProps {
  title: string;
  icon: React.ReactNode;
  /** 職種ごとの意味色。アイコン・見出し・かぶり時間に同じ色を掛ける */
  tone: string;
  entries: OverlapEntry[];
}

function OverlapSection({ title, icon, tone, entries }: OverlapSectionProps) {
  return (
    <Card>
      <CardHeader>
        <span className={cn('[&>svg]:size-4', tone)} aria-hidden="true">
          {icon}
        </span>
        <CardTitle as="h3" tone={tone}>
          {title}
        </CardTitle>
        <Badge variant="secondary" className="tabular ml-auto">
          {entries.length}人
        </Badge>
      </CardHeader>
      <CardContent padding="below-header">
        {entries.length === 0 ? (
          <p className="text-muted-foreground py-2 text-sm">かぶっている人はいません</p>
        ) : (
          <ul className="divide-y">
            {entries.map((e, i) => (
              <li
                key={`${e.name}-${i}`}
                className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <span className="truncate text-sm font-medium">{e.name}</span>
                <span className="tabular flex shrink-0 flex-col items-end text-right">
                  <span className="text-sm">
                    {formatMin(e.startAsMin)}–{formatMin(e.endAsMin)}
                  </span>
                  <span className={cn('text-xs', tone)}>
                    かぶり {formatMin(e.overlapStartAsMin)}–{formatMin(e.overlapEndAsMin)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function OverlapSkeleton() {
  return (
    <SkeletonGroup label="同じ時間に入る人を取得中" className="space-y-5">
      {[0, 1].map((i) => (
        <Card key={i}>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
          </CardContent>
        </Card>
      ))}
    </SkeletonGroup>
  );
}

interface DayOverlapProps {
  /** "YYYY-MM-DD"。カレンダーで選んでいる日 */
  date: string;
  onSessionExpired: () => void;
}

/**
 * カレンダーで選んだ日に、同じ時間帯へ入るフロア／キッチンの人を出す。
 *
 * 自分のシフトが無い日は何も描かない。その旨は直前の CalendarDayDetail が
 * 「休み」「この日のシフトはありません」として既に伝えているため。
 */
export function DayOverlap({ date, onSessionExpired }: DayOverlapProps) {
  const { result, loading, error, fetchOverlap } = useOverlap(onSessionExpired);

  useEffect(() => {
    fetchOverlap(date);
  }, [date, fetchOverlap]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle aria-hidden="true" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (loading) return <OverlapSkeleton />;
  if (!result?.self) return null;

  return (
    <>
      <h3 className="text-muted-foreground text-sm font-semibold tracking-tight">
        同じ時間に入る人
      </h3>
      <OverlapSection
        title="フロア"
        icon={<UtensilsCrossed />}
        tone="text-floor"
        entries={result.floor}
      />
      <OverlapSection
        title="キッチン"
        icon={<ChefHat />}
        tone="text-kitchen"
        entries={result.kitchen}
      />
    </>
  );
}
