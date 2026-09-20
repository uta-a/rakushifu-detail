import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import type { DayEntry, SubmitTerm, SubmittableStore } from '../types/shift';
import { useSubmitContext } from '../hooks/useSubmitContext';
import { useDesiredShifts } from '../hooks/useDesiredShifts';
import {
  applyBulk,
  buildDayEntries,
  clampToRange,
  countByKind,
  defaultTermIndex,
  isDirty,
  isTermClosed,
  selectableRange,
  timeOptions,
  toUpsertPayload,
  type BulkRule,
  type TimeRange,
} from '../utils/shiftSubmit';
import { formatMonthDayWithWeekday } from '../utils/calendar';
import { parseShiftDate } from '../utils/date';
import { ShiftSubmitDayRow } from '../components/ShiftSubmitDayRow';
import { ShiftSubmitBulkDialog } from '../components/ShiftSubmitBulkDialog';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Dialog } from '../components/ui/dialog';
import { Skeleton, SkeletonGroup } from '../components/ui/skeleton';

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

/** "2026-10-10T23:59:00.000+09:00" → "10/10 23:59" */
function formatDeadline(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${date.getMonth() + 1}/${date.getDate()} ${hh}:${mm}`;
}

function formatTermRange(term: SubmitTerm): string {
  return `${formatMonthDayWithWeekday(term.start_date)}〜${formatMonthDayWithWeekday(term.end_date)}`;
}

interface ShiftSubmitProps {
  onSessionExpired: () => void;
  /** 未提出の変更があるか。タブを離れるときの引き止めに使う */
  onDirtyChange?: (dirty: boolean) => void;
}

/**
 * 希望シフトの提出・閲覧・編集。
 *
 * らくしふの upsert は期間を丸ごと置き換えるため、提出時は必ず期間内の全日付を送る
 * （toUpsertPayload がそれを保証する）。提出済みの期間を開いた場合も同じ画面で、
 * 既存の値が入った状態から編集して上書きする。
 */
export function ShiftSubmit({ onSessionExpired, onDirtyChange }: ShiftSubmitProps) {
  const { context, loading: contextLoading, error: contextError, fetchContext } =
    useSubmitContext(onSessionExpired);
  const {
    loading: shiftsLoading,
    error: shiftsError,
    submitting,
    submitError,
    invalidDates,
    fetchDesiredShifts,
    submitShifts,
  } = useDesiredShifts(onSessionExpired);

  /** ユーザーが期間を動かしたら、その位置を覚える（既定は期限内で最も早い期間） */
  const [termIndexOverride, setTermIndexOverride] = useState<number | null>(null);
  const [entries, setEntries] = useState<DayEntry[]>([]);
  const [baseline, setBaseline] = useState<DayEntry[]>([]);
  /** entries がどの期間のものか。期間切り替え直後に前の期間の内容を見せないための印 */
  const [loadedTermKey, setLoadedTermKey] = useState<string | null>(null);
  const [submittedTermKey, setSubmittedTermKey] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    fetchContext();
  }, [fetchContext]);

  const defaultIndex = useMemo(
    () => (context ? defaultTermIndex(context.terms, new Date()) : -1),
    [context]
  );
  const termIndex = termIndexOverride ?? defaultIndex;
  const rawTerm = context && termIndex >= 0 ? context.terms[termIndex] : undefined;
  const termKey = rawTerm ? rawTerm.start_date : '';

  // 提出直後は context の submitted が古いままなので、この画面から出した分を重ねる。
  // buildDayEntries はこのフラグで「初期値を入れるかどうか」を決める
  const term = useMemo(
    () =>
      rawTerm
        ? { ...rawTerm, submitted: rawTerm.submitted || submittedTermKey === rawTerm.start_date }
        : undefined,
    [rawTerm, submittedTermKey]
  );

  const store: SubmittableStore | undefined = useMemo(() => {
    if (!context || !term) return undefined;
    return context.stores.find((s) => s.id === term.store_id) ?? context.stores[0];
  }, [context, term]);

  /** 曜日ごとの入力可能な時間帯（店舗の範囲 ∩ 勤務可能時間帯） */
  const rangeByWeekday = useMemo(() => {
    const map = new Map<number, TimeRange>();
    if (!context || !store) return map;
    for (const weekday of WEEKDAYS) {
      const acceptable = context.acceptableTimes.find((a) => a.weekday === weekday);
      map.set(weekday, selectableRange(acceptable, store));
    }
    return map;
  }, [context, store]);

  const allOptions = useMemo(() => (store ? timeOptions(store) : []), [store]);

  const optionsByWeekday = useMemo(() => {
    const map = new Map<number, number[]>();
    for (const weekday of WEEKDAYS) {
      const range = rangeByWeekday.get(weekday);
      map.set(
        weekday,
        range ? allOptions.filter((m) => m >= range.startAsMin && m <= range.endAsMin) : allOptions
      );
    }
    return map;
  }, [allOptions, rangeByWeekday]);

  // 期間が決まったら、その期間ぶんの入力状態を組み立てる
  useEffect(() => {
    if (!context || !term || !store) return;
    let active = true;
    fetchDesiredShifts(term.start_date, term.end_date).then((results) => {
      if (!active || !results) return;
      const built = buildDayEntries(
        term,
        results,
        context.basicShifts,
        context.acceptableTimes,
        store
      );
      setEntries(built);
      setBaseline(built);
      setLoadedTermKey(term.start_date);
    });
    return () => {
      active = false;
    };
  }, [context, term, store, fetchDesiredShifts]);

  const error = contextError ?? shiftsError;
  const ready = termKey !== '' && loadedTermKey === termKey;
  const closed = term ? isTermClosed(term, new Date()) : false;
  const dirty = ready && isDirty(entries, baseline);
  const counts = countByKind(entries);
  const loading = !error && (contextLoading || shiftsLoading || !ready);
  // 提出した期間を編集し始めたら、成功メッセージは引っ込める
  const submitted = submittedTermKey === termKey && !dirty;

  const offLimit = context?.offLimit;
  const offLimitExceeded =
    offLimit?.has_limit === true && offLimit.max_count !== null && counts.off > offLimit.max_count;

  // タブを離れるときの引き止めは親（MainTabs）が持つ
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  // 未保存のままリロード・タブを閉じようとしたら引き止める
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const moveTerm = (delta: number) => {
    if (!context) return;
    const next = termIndex + delta;
    if (next < 0 || next >= context.terms.length) return;
    setTermIndexOverride(next);
  };

  const handleEntryChange = useCallback((updated: DayEntry) => {
    setEntries((current) => current.map((e) => (e.date === updated.date ? updated : e)));
  }, []);

  const handleBulkApply = (rule: BulkRule) => {
    setEntries((current) =>
      applyBulk(current, rule).map((entry) => {
        if (entry.kind !== 'work') return entry;
        // 一括入力の時刻はその曜日の勤務可能時間帯から外れうるので丸める
        const range = rangeByWeekday.get(parseShiftDate(entry.date).getDay());
        return range ? { ...entry, ...clampToRange(range, entry) } : entry;
      })
    );
  };

  const handleClearAll = () => {
    setEntries((current) =>
      current.map((entry) =>
        entry.fixedShiftLogId === null ? { ...entry, kind: 'none' as const } : entry
      )
    );
  };

  const handleSubmit = async () => {
    setConfirmOpen(false);
    if (!store || !context) return;
    const ok = await submitShifts(toUpsertPayload(entries, store.id, context.currentGenreId));
    if (ok) {
      setBaseline(entries);
      setSubmittedTermKey(termKey);
    }
  };

  return (
    <div className="space-y-5">
    {error && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!error && !term && !loading && (
        <Card>
          <CardContent className="flex min-h-32 flex-col items-center justify-center gap-2 text-center">
            <AlertCircle aria-hidden="true" className="text-muted-foreground size-6" />
            <p className="text-muted-foreground text-sm">提出できる期間がありません</p>
          </CardContent>
        </Card>
      )}

      {term && (
        <Card>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="icon"
                aria-label="前の期間"
                disabled={termIndex <= 0}
                onClick={() => moveTerm(-1)}
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <h2 className="tabular text-center text-base font-semibold tracking-tight">
                {formatTermRange(term)}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                aria-label="次の期間"
                disabled={!context || termIndex === context.terms.length - 1}
                onClick={() => moveTerm(1)}
              >
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <Badge variant={term.submitted ? 'secondary' : 'outline'}>
                {term.submitted ? '提出済み' : '未提出'}
              </Badge>
              <span className="tabular text-muted-foreground text-xs">
                提出期限 {formatDeadline(term.submit_end_at)}
              </span>
              {store && <span className="text-muted-foreground text-xs">{store.name}</span>}
            </div>

            {!closed && (
              <div className="flex justify-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}>
                  一括入力
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClearAll}>
                  すべて未入力に
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {closed && (
        <Alert>
          <AlertCircle aria-hidden="true" />
          <AlertDescription>
            提出期限を過ぎているため編集できません。内容の確認のみできます。
          </AlertDescription>
        </Alert>
      )}

      {submitted && (
        <Alert>
          <CheckCircle2 aria-hidden="true" />
          <AlertDescription>希望シフトを提出しました。期限内なら何度でも出し直せます。</AlertDescription>
        </Alert>
      )}

      {submitError && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      {offLimitExceeded && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertDescription>
            休み希望は{offLimit?.max_count}日までです（現在 {counts.off}日）。
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <Card aria-busy="true">
          <CardContent>
            <SkeletonGroup label="希望シフトを読み込み中" className="space-y-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </SkeletonGroup>
          </CardContent>
        </Card>
      ) : (
        entries.length > 0 && (
          <Card>
            <CardContent>
              <ul className="divide-y">
                {entries.map((entry) => (
                  <ShiftSubmitDayRow
                    key={entry.date}
                    entry={entry}
                    options={optionsByWeekday.get(parseShiftDate(entry.date).getDay()) ?? allOptions}
                    disabled={closed}
                    invalid={invalidDates.includes(entry.date)}
                    onChange={handleEntryChange}
                  />
                ))}
              </ul>
            </CardContent>
          </Card>
        )
      )}
      {/* 提出バーは main の左右パディングぶん外へ出し、本文カラムいっぱいに敷く */}
      {term && !closed && (
        <div className="bg-background/80 sticky bottom-0 z-10 -mx-4 border-t px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <p className="tabular text-muted-foreground text-xs">
              出勤 {counts.work}日 / 休み {counts.off}日 / 未入力 {counts.none}日
            </p>
            <Button
              disabled={!dirty || submitting || loading || offLimitExceeded}
              onClick={() => setConfirmOpen(true)}
            >
              {submitting ? '提出中…' : term.submitted ? '変更を提出' : 'シフトを提出'}
            </Button>
          </div>
        </div>
      )}

      {store && (
        <ShiftSubmitBulkDialog
          open={bulkOpen}
          onOpenChange={setBulkOpen}
          options={allOptions}
          defaultRange={rangeByWeekday.get(1) ?? selectableRange(undefined, store)}
          onApply={handleBulkApply}
        />
      )}

      <Dialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="この内容で提出しますか？"
        description={term ? `${formatTermRange(term)} の希望を、この内容で置き換えます。` : undefined}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setConfirmOpen(false)}>
              キャンセル
            </Button>
            <Button size="sm" onClick={handleSubmit}>
              提出する
            </Button>
          </>
        }
      >
        <ul className="tabular text-sm">
          <li>出勤希望：{counts.work}日</li>
          <li>休み希望：{counts.off}日</li>
          <li>未入力：{counts.none}日</li>
        </ul>
      </Dialog>
    </div>
  );
}
