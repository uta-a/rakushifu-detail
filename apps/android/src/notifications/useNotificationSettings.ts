import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { checkShifts, type CheckResult } from './check';
import {
  disableShiftNotifications,
  enableShiftNotifications,
  hasPermission,
  resumeShiftNotifications,
} from './control';
import * as storage from './storage';

interface State {
  loaded: boolean;
  enabled: boolean;
  paused: boolean;
  permission: boolean;
  lastCheckedAt: Date | null;
}

const INITIAL: State = { loaded: false, enabled: false, paused: false, permission: false, lastCheckedAt: null };

/** 設定画面の通知の状態と操作。画面に戻るたびに読み直す（端末の設定で許可を変えて戻ってくるため） */
export function useNotificationSettings() {
  const [state, setState] = useState<State>(INITIAL);
  const [busy, setBusy] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [lastResult, setLastResult] = useState<CheckResult | 'error' | null>(null);

  const reload = useCallback(async () => {
    const [enabled, paused, permission, lastCheckedAt] = await Promise.all([
      storage.isEnabled(),
      storage.isPaused(),
      hasPermission(),
      storage.loadLastCheckedAt(),
    ]);
    setState({ loaded: true, enabled, paused, permission, lastCheckedAt });
    if (permission) setPermissionDenied(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const run = useCallback(
    async (action: () => Promise<void>) => {
      setBusy(true);
      try {
        await action();
      } finally {
        await reload();
        setBusy(false);
      }
    },
    [reload],
  );

  const checkNow = useCallback(
    () =>
      run(async () => {
        setLastResult(null);
        try {
          setLastResult(await checkShifts());
        } catch {
          setLastResult('error');
        }
      }),
    [run],
  );

  const setEnabled = useCallback(
    (enabled: boolean) =>
      run(async () => {
        setLastResult(null);
        if (!enabled) {
          await disableShiftNotifications();
          return;
        }
        const ok = await enableShiftNotifications();
        setPermissionDenied(!ok);
        // オンにした時点で基準を取っておく（次の確認から差分が出せるように）
        if (ok) {
          try {
            setLastResult(await checkShifts());
          } catch {
            setLastResult('error');
          }
        }
      }),
    [run],
  );

  const resume = useCallback(
    () =>
      run(async () => {
        await resumeShiftNotifications();
        try {
          setLastResult(await checkShifts());
        } catch {
          setLastResult('error');
        }
      }),
    [run],
  );

  return { ...state, busy, permissionDenied, lastResult, setEnabled, checkNow, resume };
}
