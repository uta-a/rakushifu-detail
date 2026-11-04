import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isUnauthorized, type RakushifuClient } from '@rakushifu/core';
import { resetShiftNotifications, resumeShiftNotifications } from '@/notifications/control';
import { client } from './client';
import { clearCredentials, loadCredentials, saveCredentials } from './credentials';

export type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

interface AuthValue {
  status: AuthStatus;
  signIn(employeeCode: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  /**
   * クライアントを呼ぶ共通の入口。セッション切れ（401）なら保存した認証情報で
   * 一度だけ再ログインしてやり直す。それでも 401 ならログイン画面へ戻す。
   */
  call<T>(run: (client: RakushifuClient) => Promise<T>): Promise<T>;
}

const AuthContext = createContext<AuthValue | null>(null);

class NoCredentialsError extends Error {
  constructor() {
    super('ログインしてください');
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('loading');
  // 同時に複数の取得が 401 になっても、再ログインは1回にまとめる
  const reloginRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    // 認証情報があればログイン済みとして始め、cookie が切れていれば最初の取得で再ログインする
    loadCredentials()
      .then((credentials) => setStatus(credentials ? 'signedIn' : 'signedOut'))
      .catch(() => setStatus('signedOut'));
  }, []);

  const signOut = useCallback(async () => {
    await clearCredentials();
    // 次にログインする人に、前の人のシフトの差分や通知の設定を引き継がない
    await resetShiftNotifications();
    queryClient.clear();
    setStatus('signedOut');
  }, [queryClient]);

  const signIn = useCallback(async (employeeCode: string, password: string) => {
    await client.login(employeeCode, password);
    await saveCredentials({ employeeCode, password });
    // 再ログインの失敗で止めていた通知を、ログインし直したら再開する
    await resumeShiftNotifications();
    setStatus('signedIn');
  }, []);

  const relogin = useCallback(() => {
    reloginRef.current ??= (async () => {
      try {
        const credentials = await loadCredentials();
        if (!credentials) throw new NoCredentialsError();
        await client.login(credentials.employeeCode, credentials.password);
      } finally {
        reloginRef.current = null;
      }
    })();
    return reloginRef.current;
  }, []);

  const call = useCallback(
    async <T,>(run: (c: RakushifuClient) => Promise<T>): Promise<T> => {
      try {
        return await run(client);
      } catch (error) {
        if (!isUnauthorized(error)) throw error;
      }

      // 再ログインは1回の失敗につき1回まで（自動ログインの連打でロックされないように）。
      // 認証情報が無い・通らないときはログイン画面へ戻す。通信の失敗ならログイン状態は保つ。
      try {
        await relogin();
      } catch (error) {
        if (isUnauthorized(error) || error instanceof NoCredentialsError) await signOut();
        throw error;
      }
      try {
        return await run(client);
      } catch (error) {
        if (isUnauthorized(error)) await signOut();
        throw error;
      }
    },
    [relogin, signOut],
  );

  const value = useMemo(() => ({ status, signIn, signOut, call }), [status, signIn, signOut, call]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth は AuthProvider の内側で使うこと');
  return value;
}
