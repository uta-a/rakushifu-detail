export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'rakushifu-theme';

export function readStoredTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  } catch {
    // localStorage が使えない環境ではOS設定に従う
  }
  return 'system';
}

export function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // 保存できなくても表示は続行する
  }
}

/**
 * html 要素のクラスを更新する。
 * system のときはクラスを付けず、index.css の prefers-color-scheme に任せる。
 * color-scheme も index.css 側で宣言しているので、ここでは触らない。
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('light', theme === 'light');
}
