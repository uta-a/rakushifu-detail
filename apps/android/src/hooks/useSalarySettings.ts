import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SalarySettings } from '@rakushifu/core';

const STORAGE_KEY = 'salary-settings';

/** Web版と同じ既定値 */
export const DEFAULT_SALARY_SETTINGS: SalarySettings = { hourlyRate: 1200, transportCost: 0 };

/** 保存値が壊れていたら既定値に戻す（負値・NaN を計算に入れない） */
function parseSettings(saved: string | null): SalarySettings {
  if (!saved) return DEFAULT_SALARY_SETTINGS;
  try {
    const parsed = JSON.parse(saved);
    const hourlyRate = Number(parsed?.hourlyRate);
    const transportCost = Number(parsed?.transportCost);
    if (Number.isFinite(hourlyRate) && hourlyRate >= 0 && Number.isFinite(transportCost) && transportCost >= 0) {
      return { hourlyRate, transportCost };
    }
  } catch {
    // 壊れた値は既定値で上書きされるまで無視する
  }
  return DEFAULT_SALARY_SETTINGS;
}

/** 時給・交通費。端末の AsyncStorage に保存する（認証情報ではないので secure-store は使わない） */
export function useSalarySettings() {
  const [settings, setSettings] = useState<SalarySettings>(DEFAULT_SALARY_SETTINGS);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => setSettings(parseSettings(saved)))
      .catch(() => {});
  }, []);

  const save = useCallback((next: SalarySettings) => {
    setSettings(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  return { settings, save };
}
