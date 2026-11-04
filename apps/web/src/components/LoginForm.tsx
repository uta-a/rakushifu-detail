import { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { ThemeToggle } from './ThemeToggle';

interface LoginFormProps {
  onLoginSuccess: () => void;
}

export function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeCode: employeeId, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ログインに失敗しました');
      }

      sessionStorage.setItem('rakushifu-cookies', data.cookies);
      onLoginSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 px-4 py-10">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">らくしふツール</h1>
          <p className="text-muted-foreground text-sm">
            従業員IDとパスワードでシフトを取得します
          </p>
        </div>
        <ThemeToggle />
      </div>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employeeId">従業員ID</Label>
              <Input
                id="employeeId"
                type="text"
                autoComplete="username"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                aria-invalid={!!error || undefined}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!error || undefined}
                required
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle aria-hidden="true" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
              {loading ? 'ログイン中...' : 'ログイン'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* autoComplete を付けているので、保存しないのが「このツール」であることを明示する。
          ブラウザのパスワードマネージャによる保存は別で、こちらでは制御できない */}
      <p className="text-muted-foreground text-center text-xs">
        このツールは認証情報を保存しません（ブラウザの保存機能は別です）。
        取得したセッションはタブを閉じると破棄されます。
      </p>
    </div>
  );
}
