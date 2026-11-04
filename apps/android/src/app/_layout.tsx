import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/lib/auth';
import { queryClient, useAppStateFocus } from '@/lib/query';
import { setupNotifications } from '@/notifications/control';
import { ThemeProvider, useTheme } from '@/theme/theme';
import { fontSize } from '@/theme/tokens';
// バックグラウンドの確認タスクを定義する（読み込むだけでよい。アプリが閉じていても起きられるように最上位で読む）
import '@/notifications/task';

// 保存済みの認証情報を読み終えるまでスプラッシュを出したままにする（ログイン画面のちらつき防止）
SplashScreen.preventAutoHideAsync().catch(() => {});
setupNotifications().catch(() => {});

export default function RootLayout() {
  useAppStateFocus();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

/** 通知を押して開いたら、通知の種類に合わせたタブへ移る */
function useNotificationNavigation(signedIn: boolean) {
  const router = useRouter();
  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!signedIn || !response) return;
    const target = response.notification.request.content.data?.target;
    router.navigate(target === 'submit' ? '/submit' : '/');
    // 同じ通知でもう一度移らないよう、処理したら消す
    void Notifications.clearLastNotificationResponseAsync();
  }, [signedIn, response, router]);
}

function RootNavigator() {
  const { status } = useAuth();
  const { colors, scheme } = useTheme();
  useNotificationNavigation(status === 'signedIn');

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hide();
  }, [status]);

  if (status === 'loading') return null;

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Protected guard={status === 'signedIn'}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="settings"
            options={{
              headerShown: true,
              title: '設定',
              headerStyle: { backgroundColor: colors.background },
              headerShadowVisible: false,
              headerTintColor: colors.foreground,
              // Stack のヘッダーは letterSpacing を受け付けないので、サイズと太さだけ揃える
              headerTitleStyle: { fontSize: fontSize.base, fontWeight: '600' },
            }}
          />
        </Stack.Protected>
        <Stack.Protected guard={status === 'signedOut'}>
          <Stack.Screen name="login" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
