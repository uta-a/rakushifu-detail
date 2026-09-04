import { useCallback, useEffect, useState } from 'react';
import { applyTheme, readStoredTheme, storeTheme, type Theme } from '../lib/theme';

/**
 * テーマの選択（light / dark / system）を保持する。
 * system のときはクラスを付けず、index.css の prefers-color-scheme に任せる。
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    storeTheme(next);
    setThemeState(next);
  }, []);

  return { theme, setTheme };
}
