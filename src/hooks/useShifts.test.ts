import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useShifts } from './useShifts';

const COOKIE_KEY = 'rakushifu-cookies';

describe('useShifts 認証切れハンドリング', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('401 応答で sessionStorage をクリアし onUnauthorized を呼ぶ', async () => {
    sessionStorage.setItem(COOKIE_KEY, 'dummy-cookie');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: 'ログインしてください' }),
      })
    );
    const onUnauthorized = vi.fn();
    const { result } = renderHook(() => useShifts(onUnauthorized));

    await act(async () => {
      await result.current.fetchShifts(2026, 3);
    });

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(COOKIE_KEY)).toBeNull();
    expect(result.current.error).toBeTruthy();
    expect(result.current.schedules).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('cookie が無い場合は fetch せずエラーを出し onUnauthorized は呼ばない', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const onUnauthorized = vi.fn();
    const { result } = renderHook(() => useShifts(onUnauthorized));

    await act(async () => {
      await result.current.fetchShifts(2026, 3);
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(result.current.error).toBe('ログインしてください');
  });

  it('401 以外のエラーでは onUnauthorized を呼ばず cookie を保持する', async () => {
    sessionStorage.setItem(COOKIE_KEY, 'dummy-cookie');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'サーバーエラー' }),
      })
    );
    const onUnauthorized = vi.fn();
    const { result } = renderHook(() => useShifts(onUnauthorized));

    await act(async () => {
      await result.current.fetchShifts(2026, 3);
    });

    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(COOKIE_KEY)).toBe('dummy-cookie');
    expect(result.current.error).toBeTruthy();
  });
});
