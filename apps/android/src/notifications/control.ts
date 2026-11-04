import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { CHANNEL_ID } from './check';
import * as storage from './storage';
import { CHECK_INTERVAL_MINUTES, SHIFT_CHECK_TASK } from './task';

/** アプリの起動時に一度呼ぶ。チャンネルを作り、前面にいるときも通知を出すようにする */
export async function setupNotifications(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'シフトのお知らせ',
    description: '確定シフトの公開・変更、希望シフトの提出期間と締切',
    importance: AndroidImportance.DEFAULT,
  });
}

/** 通知の許可を求める（Android 13 以降は実行時の許可が要る）。許可されたら true */
export async function requestPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

export async function hasPermission(): Promise<boolean> {
  return (await Notifications.getPermissionsAsync()).granted;
}

async function registerTask(): Promise<void> {
  await BackgroundTask.registerTaskAsync(SHIFT_CHECK_TASK, { minimumInterval: CHECK_INTERVAL_MINUTES });
}

async function unregisterTask(): Promise<void> {
  // 登録していなければ何もしない（unregister は未登録だと例外を投げる）
  if (await TaskManager.isTaskRegisteredAsync(SHIFT_CHECK_TASK)) {
    await BackgroundTask.unregisterTaskAsync(SHIFT_CHECK_TASK);
  }
}

/** 通知をオンにして定期確認を登録する。許可が無ければ false（オンにしない） */
export async function enableShiftNotifications(): Promise<boolean> {
  if (!(await requestPermission())) return false;
  await storage.setEnabled(true);
  await storage.setPaused(false);
  await registerTask();
  return true;
}

export async function disableShiftNotifications(): Promise<void> {
  await storage.setEnabled(false);
  await unregisterTask();
}

/** ログアウト時。定期確認をやめ、スナップショットも設定も消す */
export async function resetShiftNotifications(): Promise<void> {
  await unregisterTask().catch(() => {});
  await storage.clearAll();
}

/** ログインし直したとき。再ログインの失敗で止めていた確認を再開する */
export async function resumeShiftNotifications(): Promise<void> {
  await storage.setPaused(false);
  // オンのまま再インストールした場合などに備え、オンなら登録し直しておく
  if (await storage.isEnabled()) await registerTask();
}
