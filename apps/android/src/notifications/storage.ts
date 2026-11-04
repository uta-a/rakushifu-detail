import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ShiftSnapshot } from '@rakushifu/core';

// 通知まわりの状態。認証情報ではないので AsyncStorage に置く（認証情報は secure-store だけ）
const ENABLED_KEY = 'notify.enabled';
const SNAPSHOT_KEY = 'notify.snapshot';
const PAUSED_KEY = 'notify.paused';
const LAST_CHECKED_KEY = 'notify.lastCheckedAt';

export async function isEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(ENABLED_KEY)) === '1';
}

export async function setEnabled(enabled: boolean): Promise<void> {
  if (enabled) await AsyncStorage.setItem(ENABLED_KEY, '1');
  else await AsyncStorage.removeItem(ENABLED_KEY);
}

/** 再ログインに失敗して確認を止めているか */
export async function isPaused(): Promise<boolean> {
  return (await AsyncStorage.getItem(PAUSED_KEY)) === '1';
}

export async function setPaused(paused: boolean): Promise<void> {
  if (paused) await AsyncStorage.setItem(PAUSED_KEY, '1');
  else await AsyncStorage.removeItem(PAUSED_KEY);
}

export async function loadSnapshot(): Promise<ShiftSnapshot | null> {
  const saved = await AsyncStorage.getItem(SNAPSHOT_KEY);
  if (!saved) return null;
  try {
    return JSON.parse(saved) as ShiftSnapshot;
  } catch {
    // 壊れていたら初回と同じ扱い（基準を取り直す）にする
    return null;
  }
}

export async function saveSnapshot(snapshot: ShiftSnapshot): Promise<void> {
  await AsyncStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
}

export async function loadLastCheckedAt(): Promise<Date | null> {
  const saved = await AsyncStorage.getItem(LAST_CHECKED_KEY);
  return saved ? new Date(saved) : null;
}

export async function saveLastCheckedAt(date: Date): Promise<void> {
  await AsyncStorage.setItem(LAST_CHECKED_KEY, date.toISOString());
}

/** ログアウト時に全部消す（次にログインする人へ引き継がない） */
export async function clearAll(): Promise<void> {
  await AsyncStorage.multiRemove([ENABLED_KEY, SNAPSHOT_KEY, PAUSED_KEY, LAST_CHECKED_KEY]);
}
