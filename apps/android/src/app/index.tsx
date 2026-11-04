import { Redirect } from 'expo-router';

// 起動時の / はカレンダーへ。未ログインなら Stack.Protected がログイン画面へ送る
export default function Index() {
  return <Redirect href="/calendar" />;
}
