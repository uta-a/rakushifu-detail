import { useState, useEffect } from 'react';
import { AlertCircle, CalendarOff, ChefHat, UtensilsCrossed } from 'lucide-react';
import { useOverlap } from '../hooks/useOverlap';
import type { OverlapEntry } from '../types/shift';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Skeleton, SkeletonGroup } from '../components/ui/skeleton';

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatMin(min: number): string {
  const normalized = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

interface OverlapSectionProps {
  title: string;
  icon: React.ReactNode;
  entries: OverlapEntry[];
}

/** フロア／キッチンの区別は色ではなくアイコンと見出しで持たせる */
function OverlapSection({ title, icon, entries }: OverlapSectionProps) {
  return (
    <Card>
      <CardHeader>
        <span className="text-muted-foreground [&>svg]:size-4" aria-hidden="true">
          {icon}
        </span>
        <CardTitle as="h3" className="text-foreground">
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
                  <span className="text-muted-foreground text-xs">
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
    <SkeletonGroup label="シフトを取得中" className="space-y-5">
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

interface ShiftOverlapProps {
  onSessionExpired: () => void;
}

export function ShiftOverlap({ onSessionExpired }: ShiftOverlapProps) {
  const [date, setDate] = useState(todayString);
  const { result, loading, error, fetchOverlap } = useOverlap(onSessionExpired);

  useEffect(() => {
    fetchOverlap(date);
  }, [date, fetchOverlap]);

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="overlap-date">日付を選択</Label>
            <Input
              id="overlap-date"
              type="date"
              className="tabular"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          {result?.self && (
            <p className="text-muted-foreground text-sm">
              自分のシフト{' '}
              <span className="tabular text-foreground font-medium">
                {formatMin(result.self.startAsMin)}–{formatMin(result.self.endAsMin)}
              </span>
            </p>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && !error && <OverlapSkeleton />}

      {!loading && !error && result && !result.self && (
        <Card>
          <CardContent className="flex min-h-32 flex-col items-center justify-center gap-2 text-center">
            <CalendarOff className="text-muted-foreground size-6" aria-hidden="true" />
            <p className="text-muted-foreground text-sm">この日は自分のシフトがありません</p>
          </CardContent>
        </Card>
      )}

      {!loading && !error && result?.self && (
        <>
          <OverlapSection
            title="フロア"
            icon={<UtensilsCrossed />}
            entries={result.floor}
          />
          <OverlapSection title="キッチン" icon={<ChefHat />} entries={result.kitchen} />
        </>
      )}
    </div>
  );
}
