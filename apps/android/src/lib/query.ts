import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { QueryClient, focusManager } from '@tanstack/react-query';
import { RakushifuError } from '@rakushifu/core';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 入力や認証の誤り（4xx）は繰り返しても直らないので、上流の一時的な失敗だけ1回やり直す
      retry: (failureCount, error) =>
        failureCount < 1 && !(error instanceof RakushifuError && error.status < 500),
    },
  },
});

/** アプリが前面に戻ったら再取得する（RN にはウィンドウの focus イベントが無いため） */
export function useAppStateFocus() {
  useEffect(() => {
    const onChange = (status: AppStateStatus) => focusManager.setFocused(status === 'active');
    const subscription = AppState.addEventListener('change', onChange);
    return () => subscription.remove();
  }, []);
}
