import { useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import {
  applyBulk,
  buildDayEntries,
  clampToRange,
  countByKind,
  defaultTermIndex,
  formatMonthDayWithWeekday,
  isDirty,
  isTermClosed,
  parseShiftDate,
  RakushifuError,
  selectableRange,
  timeOptions,
  toUpsertPayload,
  type BulkRule,
  type DayEntry,
  type DesiredSchedule,
  type SubmitContextResponse,
  type SubmittableStore,
  type SubmitTerm,
  type TimeRange,
} from '@rakushifu/core';
import { useDesiredShifts, useSubmitContext, useSubmitShifts } from '@/hooks/useSubmit';
import { Screen } from '@/components/Screen';
import { BulkDialog } from '@/components/submit/BulkDialog';
import { DayRow } from '@/components/submit/DayRow';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { errorMessage } from '@/lib/format';
import { useReportSubmitDirty } from '@/lib/unsavedChanges';
import { useTheme } from '@/theme/theme';
import { control, radius, space } from '@/theme/tokens';

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

interface FormState {
  entries: DayEntry[];
  baseline: DayEntry[];
  loadedTermKey: string | null;
}

const EMPTY_FORM: FormState = { entries: [], baseline: [], loadedTermKey: null };

/** 入力状態を最後に組み立てたときの元の値（変わったら組み直す） */
interface BuildSource {
  context: SubmitContextResponse;
  term: SubmitTerm;
  store: SubmittableStore;
  desired: DesiredSchedule[];
}

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

function TermNavButton({ direction, disabled, onPress }: {
  direction: 'prev' | 'next';
  disabled: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const Icon = direction === 'prev' ? ChevronLeft : ChevronRight;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={direction === 'prev' ? '前の期間' : '次の期間'}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: control.default,
        height: control.default,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? colors.accent : 'transparent',
        opacity: disabled ? 0.5 : 1,
      })}
    >
      <Icon size={16} color={colors.foreground} />
    </Pressable>
  );
}

/**
 * 希望シフトの提出・閲覧・編集（Web版の ShiftSubmit）。
 *
 * らくしふの upsert は期間を丸ごと置き換えるため、提出時は必ず期間内の全日付を送る
 * （toUpsertPayload がそれを保証する）。提出済みの期間を開いた場合も同じ画面で、
 * 既存の値が入った状態から編集して上書きする。
 */
export default function SubmitScreen() {
  const contextQuery = useSubmitContext();
  const context = contextQuery.data;
  const submitMutation = useSubmitShifts();

  /** ユーザーが期間を動かしたら、その位置を覚える（既定は期限内で最も早い期間） */
  const [termIndexOverride, setTermIndexOverride] = useState<number | null>(null);
  /**
   * 編集中の内容（entries）と、取得した時点の内容（baseline）と、それがどの期間のものか
   * （loadedTermKey。期間切り替え直後に前の期間の内容を見せないための印）。
   * 取り直したときに「編集中なら上書きしない」を1回の更新で判断するため、1つにまとめて持つ。
   */
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const { entries, baseline, loadedTermKey } = form;
  const setEntries = useCallback(
    (update: (current: DayEntry[]) => DayEntry[]) => setForm((f) => ({ ...f, entries: update(f.entries) })),
    [],
  );
  const [submittedTermKey, setSubmittedTermKey] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const defaultIndex = useMemo(() => (context ? defaultTermIndex(context.terms, new Date()) : -1), [context]);
  const termIndex = termIndexOverride ?? defaultIndex;
  const rawTerm = context && termIndex >= 0 ? context.terms[termIndex] : undefined;
  const termKey = rawTerm ? rawTerm.start_date : '';

  // 提出直後に取り直すまでは context の submitted が古いので、この画面から出した分を重ねる。
  // buildDayEntries はこのフラグで「初期値を入れるかどうか」を決める
  const term = useMemo(
    () => (rawTerm ? { ...rawTerm, submitted: rawTerm.submitted || submittedTermKey === rawTerm.start_date } : undefined),
    [rawTerm, submittedTermKey],
  );

  const store = useMemo(() => {
    if (!context || !term) return undefined;
    return context.stores.find((s) => s.id === term.store_id) ?? context.stores[0];
  }, [context, term]);

  const desiredQuery = useDesiredShifts(term?.start_date ?? null, term?.end_date ?? null);

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
      map.set(weekday, range ? allOptions.filter((m) => m >= range.startAsMin && m <= range.endAsMin) : allOptions);
    }
    return map;
  }, [allOptions, rangeByWeekday]);

  // 期間ぶんの提出済みの希望が届いたら、入力状態を組み立てる。アプリが前面に戻ったときや
  // 提出後の取り直しでも組み直すが、同じ期間を編集中なら上書きしない（編集内容を消さない）。
  // effect ではなく描画中に、元になる値が変わったときだけ更新する（React の推奨パターン）
  const desired = desiredQuery.data;
  const [builtFrom, setBuiltFrom] = useState<BuildSource | null>(null);
  if (
    context &&
    term &&
    store &&
    desired &&
    (builtFrom?.context !== context ||
      builtFrom.term !== term ||
      builtFrom.store !== store ||
      builtFrom.desired !== desired)
  ) {
    setBuiltFrom({ context, term, store, desired });
    const built = buildDayEntries(term, desired, context.basicShifts, context.acceptableTimes, store);
    setForm((f) =>
      f.loadedTermKey === term.start_date && isDirty(f.entries, f.baseline)
        ? f
        : { entries: built, baseline: built, loadedTermKey: term.start_date },
    );
  }

  const error = contextQuery.error ?? desiredQuery.error;
  const ready = termKey !== '' && loadedTermKey === termKey;
  const closed = term ? isTermClosed(term, new Date()) : false;
  const dirty = ready && isDirty(entries, baseline);
  const counts = countByKind(entries);
  const loading = !error && (contextQuery.isPending || (termKey !== '' && !ready));
  const submitting = submitMutation.isPending;
  // 提出した期間を編集し始めたら、成功メッセージは引っ込める
  const submitted = submittedTermKey === termKey && !dirty;
  const submitError = submitMutation.error;
  const invalidDates = submitError instanceof RakushifuError ? (submitError.invalidDates ?? []) : [];

  const offLimit = context?.offLimit;
  const offLimitExceeded = offLimit?.has_limit === true && offLimit.max_count !== null && counts.off > offLimit.max_count;

  useReportSubmitDirty(dirty);

  const moveTerm = (delta: number) => {
    if (!context) return;
    const next = termIndex + delta;
    if (next < 0 || next >= context.terms.length) return;
    setTermIndexOverride(next);
    submitMutation.reset();
  };

  const handleEntryChange = useCallback(
    (updated: DayEntry) => setEntries((current) => current.map((e) => (e.date === updated.date ? updated : e))),
    [setEntries],
  );

  const handleBulkApply = (rule: BulkRule) => {
    setEntries((current) =>
      applyBulk(current, rule).map((entry) => {
        if (entry.kind !== 'work') return entry;
        // 一括入力の時刻はその曜日の勤務可能時間帯から外れうるので丸める
        const range = rangeByWeekday.get(parseShiftDate(entry.date).getDay());
        return range ? { ...entry, ...clampToRange(range, entry) } : entry;
      }),
    );
  };

  const handleClearAll = () => {
    setEntries((current) =>
      current.map((entry) => (entry.fixedShiftLogId === null ? { ...entry, kind: 'none' as const } : entry)),
    );
  };

  const handleSubmit = () => {
    setConfirmOpen(false);
    if (!store || !context) return;
    const submittedEntries = entries;
    submitMutation.mutate(toUpsertPayload(submittedEntries, store.id, context.currentGenreId), {
      onSuccess: () => {
        setForm((f) => ({ ...f, baseline: submittedEntries }));
        setSubmittedTermKey(termKey);
      },
    });
  };

  const footer =
    term && !closed ? (
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3] }}>
        <Text variant="caption" tabular style={{ flexShrink: 1 }}>
          {`出勤 ${counts.work}日 / 休み ${counts.off}日 / 未入力 ${counts.none}日`}
        </Text>
        <Button disabled={!dirty || submitting || loading || offLimitExceeded} onPress={() => setConfirmOpen(true)}>
          {submitting ? '提出中…' : term.submitted ? '変更を提出' : 'シフトを提出'}
        </Button>
      </View>
    ) : undefined;

  return (
    <Screen footer={footer}>
      {error ? <Alert variant="destructive">{errorMessage(error, '提出情報の取得に失敗しました')}</Alert> : null}

      {!error && !term && !loading ? (
        <Card>
          <CardContent style={{ minHeight: 128, alignItems: 'center', justifyContent: 'center' }}>
            <Text tone="muted">提出できる期間がありません</Text>
          </CardContent>
        </Card>
      ) : null}

      {term ? (
        <Card>
          <CardContent style={{ gap: space[3] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2] }}>
              <TermNavButton direction="prev" disabled={termIndex <= 0} onPress={() => moveTerm(-1)} />
              <Text variant="title" tabular accessibilityRole="header">
                {formatTermRange(term)}
              </Text>
              <TermNavButton
                direction="next"
                disabled={!context || termIndex === context.terms.length - 1}
                onPress={() => moveTerm(1)}
              />
            </View>

            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'center',
                gap: space[2],
              }}
            >
              <Badge variant={term.submitted ? 'secondary' : 'outline'}>{term.submitted ? '提出済み' : '未提出'}</Badge>
              <Text variant="caption" tabular>
                {`提出期限 ${formatDeadline(term.submit_end_at)}`}
              </Text>
              {store ? <Text variant="caption">{store.name}</Text> : null}
            </View>

            {!closed ? (
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space[2] }}>
                <Button variant="outline" dense disabled={!ready} onPress={() => setBulkOpen(true)}>
                  一括入力
                </Button>
                <Button variant="ghost" dense disabled={!ready} onPress={handleClearAll}>
                  すべて未入力に
                </Button>
              </View>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {closed ? <Alert>提出期限を過ぎているため編集できません。内容の確認のみできます。</Alert> : null}
      {submitted ? <Alert>希望シフトを提出しました。期限内なら何度でも出し直せます。</Alert> : null}
      {submitError ? <Alert variant="destructive">{errorMessage(submitError, 'シフトの提出に失敗しました')}</Alert> : null}
      {offLimitExceeded ? (
        <Alert variant="destructive">{`休み希望は${offLimit?.max_count}日までです（現在 ${counts.off}日）。`}</Alert>
      ) : null}

      {loading ? (
        <Card>
          <CardContent>
            <SkeletonGroup label="希望シフトを読み込み中" style={{ gap: space[3] }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} height={control.default} />
              ))}
            </SkeletonGroup>
          </CardContent>
        </Card>
      ) : entries.length > 0 && ready ? (
        <Card>
          <CardContent style={{ paddingVertical: space[2] }}>
            {entries.map((entry, index) => (
              <DayRow
                key={entry.date}
                first={index === 0}
                entry={entry}
                options={optionsByWeekday.get(parseShiftDate(entry.date).getDay()) ?? allOptions}
                disabled={closed}
                invalid={invalidDates.includes(entry.date)}
                onChange={handleEntryChange}
              />
            ))}
          </CardContent>
        </Card>
      ) : null}

      {store ? (
        <BulkDialog
          // 開くたびに既定値から始める（Web版はダイアログを閉じても値が残らない）
          key={bulkOpen ? 'open' : 'closed'}
          open={bulkOpen}
          onClose={() => setBulkOpen(false)}
          options={allOptions}
          defaultRange={rangeByWeekday.get(1) ?? selectableRange(undefined, store)}
          onApply={handleBulkApply}
        />
      ) : null}

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="この内容で提出しますか？"
        description={term ? `${formatTermRange(term)} の希望を、この内容で置き換えます。` : undefined}
        footer={
          <>
            <Button variant="outline" onPress={() => setConfirmOpen(false)}>
              キャンセル
            </Button>
            <Button onPress={handleSubmit}>提出する</Button>
          </>
        }
      >
        <View>
          <Text tabular>{`出勤希望：${counts.work}日`}</Text>
          <Text tabular>{`休み希望：${counts.off}日`}</Text>
          <Text tabular>{`未入力：${counts.none}日`}</Text>
        </View>
      </Dialog>
    </Screen>
  );
}
