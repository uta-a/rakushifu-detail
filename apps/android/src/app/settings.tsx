import { Linking, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import type { CheckResult } from '@/notifications/check';
import { useNotificationSettings } from '@/notifications/useNotificationSettings';
import { space } from '@/theme/tokens';

function formatCheckedAt(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${date.getMonth() + 1}/${date.getDate()} ${hh}:${mm}`;
}

function describeResult(result: CheckResult | 'error'): { text: string; error?: boolean } {
  if (result === 'error') return { text: '確認できませんでした。通信状態を確かめて、もう一度試してください', error: true };
  switch (result.status) {
    case 'checked':
      if (result.first) return { text: '今のシフトを記録しました。次の確認から変化を通知します' };
      return { text: result.notified > 0 ? `${result.notified}件の通知を出しました` : '変化はありませんでした' };
    case 'paused':
      return { text: 'らくしふにログインできなかったため、確認を止めました', error: true };
    case 'signed-out':
      return { text: 'ログインし直してください', error: true };
    case 'disabled':
      return { text: '通知がオフです' };
  }
}

/** 電池の最適化の除外画面を開く。開けない端末ではアプリの設定画面にする */
function openBatterySettings() {
  Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS').catch(() => Linking.openSettings());
}

export default function SettingsScreen() {
  const settings = useNotificationSettings();
  const result = settings.lastResult ? describeResult(settings.lastResult) : null;

  return (
    <Screen>
      <Card>
        <CardHeader>
          <CardTitle>通知</CardTitle>
        </CardHeader>
        <CardContent padding="below-header" style={{ gap: space[4] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
            <View style={{ flex: 1, gap: space[1] }}>
              <Text style={{ fontWeight: '500' }}>シフトの通知</Text>
              <Text variant="caption">
                確定シフトが出た・変わったとき、希望シフトの提出期間が始まったとき、未提出のまま締切の24時間前になったときに知らせます。
              </Text>
            </View>
            <Switch
              accessibilityLabel="シフトの通知"
              value={settings.enabled}
              disabled={!settings.loaded || settings.busy}
              onValueChange={settings.setEnabled}
            />
          </View>

          {settings.permissionDenied ? (
            <View style={{ gap: space[2] }}>
              <Alert variant="destructive">通知が許可されていません。アプリの設定で通知を許可してから、もう一度オンにしてください。</Alert>
              <Button variant="outline" onPress={() => Linking.openSettings()}>
                アプリの設定を開く
              </Button>
            </View>
          ) : null}

          {settings.enabled && settings.paused ? (
            <View style={{ gap: space[2] }}>
              <Alert variant="destructive">
                らくしふにログインできなかったため、確認を止めています。パスワードを変えた場合は、ログアウトしてログインし直してください。
              </Alert>
              <Button variant="outline" disabled={settings.busy} onPress={settings.resume}>
                再開する
              </Button>
            </View>
          ) : null}

          {settings.enabled && !settings.paused ? (
            <View style={{ gap: space[2] }}>
              <Text variant="caption" tabular>
                {settings.lastCheckedAt
                  ? `確認はおよそ1時間おき（端末によって遅れます）。最後の確認 ${formatCheckedAt(settings.lastCheckedAt)}`
                  : '確認はおよそ1時間おき（端末によって遅れます）'}
              </Text>
              <Button variant="outline" disabled={settings.busy} onPress={settings.checkNow}>
                {settings.busy ? '確認中…' : '今すぐ確認'}
              </Button>
            </View>
          ) : null}

          {result ? (
            result.error ? (
              <Alert variant="destructive">{result.text}</Alert>
            ) : (
              <Text tone="muted">{result.text}</Text>
            )
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>電池の最適化</CardTitle>
        </CardHeader>
        <CardContent padding="below-header" style={{ gap: space[3] }}>
          <Text>
            電池の最適化が有効だと、アプリを閉じている間の確認が止まることがあります。一覧から「らくしふ詳細」を探し、「最適化しない」に変えてください。
          </Text>
          <Text variant="caption">
            Xiaomi・OPPO などの端末では、アプリの設定で「自動起動」や「バックグラウンドでの実行」も許可してください。
          </Text>
          <Button variant="outline" onPress={openBatterySettings}>
            電池の最適化の設定を開く
          </Button>
          <Button variant="ghost" onPress={() => Linking.openSettings()}>
            アプリの設定を開く
          </Button>
        </CardContent>
      </Card>
    </Screen>
  );
}
