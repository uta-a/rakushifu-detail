import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyTheme, readStoredTheme, storeTheme } from './theme';

const KEY = 'rakushifu-theme';

describe('readStoredTheme', () => {
  beforeEach(() => localStorage.clear());

  it('保存がなければ system', () => {
    expect(readStoredTheme()).toBe('system');
  });

  it.each(['light', 'dark', 'system'] as const)('保存済みの %s をそのまま返す', (theme) => {
    localStorage.setItem(KEY, theme);
    expect(readStoredTheme()).toBe(theme);
  });

  it('不正な値は system に落とす', () => {
    localStorage.setItem(KEY, 'neon');
    expect(readStoredTheme()).toBe('system');
  });

  it('localStorage が例外を投げても system を返す', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(readStoredTheme()).toBe('system');
    spy.mockRestore();
  });
});

describe('storeTheme', () => {
  beforeEach(() => localStorage.clear());

  it('保存できないときも例外を投げない', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => storeTheme('dark')).not.toThrow();
    spy.mockRestore();
  });
});

describe('applyTheme', () => {
  afterEach(() => document.documentElement.classList.remove('light', 'dark'));

  it('dark のとき .dark だけを付ける', () => {
    applyTheme('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('light')).toBe(false);
  });

  it('light のとき .light だけを付ける', () => {
    applyTheme('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('system のときはどちらも付けない（OS設定に任せる）', () => {
    applyTheme('dark');
    applyTheme('system');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.classList.contains('light')).toBe(false);
  });
});
