import { useState } from 'react';
import { KeyboardAvoidingView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RakushifuError } from '@rakushifu/core';
import { useAuth } from '@/lib/auth';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/theme/theme';
import { space } from '@/theme/tokens';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { colors } = useTheme();
  const [employeeCode, setEmployeeCode] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = employeeCode.length > 0 && password.length > 0 && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await signIn(employeeCode, password);
    } catch (e) {
      // RakushifuError の message は利用者に見せてよい文言だけ。それ以外は中身を出さない
      setError(e instanceof RakushifuError ? e.message : 'ログイン処理でエラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView behavior="height" style={{ flex: 1, justifyContent: 'center', padding: space[4] }}>
        <Card>
          <CardHeader>
            <Text variant="title">らくしふ詳細</Text>
            <Text variant="caption">らくしふの従業員IDとパスワードでログインします</Text>
          </CardHeader>
          <CardContent style={{ gap: space[4] }}>
            {error ? <Alert variant="destructive">{error}</Alert> : null}
            <Input
              label="従業員ID"
              value={employeeCode}
              onChangeText={setEmployeeCode}
              autoCapitalize="none"
              autoComplete="username"
              inputMode="numeric"
              maxLength={100}
              editable={!submitting}
            />
            <Input
              label="パスワード"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              maxLength={200}
              editable={!submitting}
              onSubmitEditing={handleSubmit}
            />
            <Button onPress={handleSubmit} disabled={!canSubmit}>
              {submitting ? 'ログイン中…' : 'ログイン'}
            </Button>
            <View>
              <Text variant="caption">パスワードはこの端末にだけ暗号化して保存され、外部のサーバーには送られません（らくしふへのログインを除く）。</Text>
            </View>
          </CardContent>
        </Card>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
