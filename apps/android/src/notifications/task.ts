import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { checkShifts } from './check';

export const SHIFT_CHECK_TASK = 'rakushifu-shift-check';

/** 確認の間隔（分）。WorkManager の都合で正確な時刻には動かず、端末によっては遅れる */
export const CHECK_INTERVAL_MINUTES = 60;

// タスクの中身はモジュールの読み込み時に定義しておく必要がある（アプリが閉じていても
// バックグラウンドで JS が起きたときに見つけられるように）。_layout.tsx から import する
TaskManager.defineTask(SHIFT_CHECK_TASK, async () => {
  try {
    await checkShifts();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    // 通信の失敗など。次の回でやり直す
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});
