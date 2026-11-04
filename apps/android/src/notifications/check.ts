import * as Notifications from 'expo-notifications';
import {
  buildShiftSnapshot,
  diffShiftSnapshots,
  formatShiftNotifications,
  isUnauthorized,
  shiftMonth,
  type RakushifuClient,
  type ShiftNotificationContent,
} from '@rakushifu/core';
import { client } from '@/lib/client';
import { loadCredentials } from '@/lib/credentials';
import * as storage from './storage';

/** 通知のチャンネル（Android の設定画面に出る名前） */
export const CHANNEL_ID = 'shifts';

export type CheckResult =
  | { status: 'disabled' }
  | { status: 'paused' }
  | { status: 'signed-out' }
  /** first は初回（基準を取っただけ）。notified は出した通知の数 */
  | { status: 'checked'; first: boolean; notified: number };

async function notify(content: ShiftNotificationContent): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title: content.title, body: content.body, data: { target: content.target } },
    trigger: { channelId: CHANNEL_ID },
  });
}

/**
 * セッションが切れていたら保存した認証情報で一度だけ再ログインしてやり直す（画面の useAuth().call と同じ規則）。
 * 再ログインが 401（パスワード変更など）なら確認を止める。後ろで失敗し続けると、
 * らくしふに異常なログインと見なされてアカウントがロックされるおそれがあるため。
 */
async function withRelogin<T>(run: (c: RakushifuClient) => Promise<T>): Promise<T | 'paused' | 'signed-out'> {
  try {
    return await run(client);
  } catch (error) {
    if (!isUnauthorized(error)) throw error;
  }

  const credentials = await loadCredentials();
  if (!credentials) return 'signed-out';
  try {
    await client.login(credentials.employeeCode, credentials.password);
  } catch (error) {
    if (!isUnauthorized(error)) throw error;
    await storage.setPaused(true);
    await notify({
      title: 'シフトの通知を止めました',
      body: 'らくしふにログインできませんでした。アプリを開いてログインし直してください',
      target: 'calendar',
    });
    return 'paused';
  }
  return await run(client);
}

async function fetchSnapshot(c: RakushifuClient, now: Date) {
  const thisMonth = { year: now.getFullYear(), month: now.getMonth() + 1 };
  const nextMonth = shiftMonth(thisMonth.year, thisMonth.month, 1);
  const [current, next, context] = await Promise.all([
    c.getConfirmedShifts(thisMonth.year, thisMonth.month),
    c.getConfirmedShifts(nextMonth.year, nextMonth.month),
    c.getSubmitContext(),
  ]);
  const monthKey = ({ year, month }: { year: number; month: number }) => `${year}-${String(month).padStart(2, '0')}`;
  return buildShiftSnapshot({
    months: [monthKey(thisMonth), monthKey(nextMonth)],
    schedules: [current, next].flatMap((res) => res.user_submit_terms.flatMap((term) => term.schedules)),
    terms: context.terms,
  });
}

let running: Promise<CheckResult> | null = null;

async function runCheck(): Promise<CheckResult> {
  if (!(await storage.isEnabled())) return { status: 'disabled' };
  if (await storage.isPaused()) return { status: 'paused' };

  const now = new Date();
  const next = await withRelogin((c) => fetchSnapshot(c, now));
  if (next === 'paused' || next === 'signed-out') return { status: next };

  const prev = await storage.loadSnapshot();
  const { events, snapshot } = diffShiftSnapshots(prev, next, now);
  const contents = formatShiftNotifications(events);
  for (const content of contents) await notify(content);
  // 通知を出し終えてから保存する（途中で落ちたら次回もう一度知らせる）
  await storage.saveSnapshot(snapshot);
  await storage.saveLastCheckedAt(now);
  return { status: 'checked', first: prev === null, notified: contents.length };
}

/**
 * 今月と来月の確定シフト・提出期間を取り、前回との差分を通知する。
 * バックグラウンドのタスクと設定画面の「今すぐ確認」から呼ぶ。同時に呼ばれても1回にまとめる。
 * 通信の失敗は例外のまま返す（次の確認でやり直す）。
 */
export function checkShifts(): Promise<CheckResult> {
  running ??= runCheck().finally(() => {
    running = null;
  });
  return running;
}
