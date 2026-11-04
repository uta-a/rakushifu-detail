import { useState } from 'react';
import { Pressable } from 'react-native';
import { Tabs } from 'expo-router';
import { CalendarDays, ClipboardList, LogOut, Wallet } from 'lucide-react-native';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth';
import { UnsavedChangesProvider, useUnsavedChanges } from '@/lib/unsavedChanges';
import { useTheme } from '@/theme/theme';
import { control, fontSize, radius, tightTracking } from '@/theme/tokens';

/** タブの「未提出の変更あり」の点の大きさ */
const DIRTY_DOT = 8;

export default function TabsLayout() {
  return (
    <UnsavedChangesProvider>
      <TabsNavigator />
    </UnsavedChangesProvider>
  );
}

/** ログアウト。未提出の変更があるときだけ、消えることを確かめてから実行する */
function LogoutButton() {
  const { colors } = useTheme();
  const { signOut } = useAuth();
  const { submitDirty } = useUnsavedChanges();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="ログアウト（この端末から認証情報を削除）"
        onPress={() => (submitDirty ? setConfirmOpen(true) : signOut())}
        style={{ width: control.default, height: control.default, alignItems: 'center', justifyContent: 'center' }}
      >
        <LogOut size={16} color={colors.mutedForeground} />
      </Pressable>
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="提出していない変更があります"
        description="ログアウトすると、シフト管理で編集した内容は失われます。"
        footer={
          <>
            <Button variant="outline" onPress={() => setConfirmOpen(false)}>
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onPress={() => {
                setConfirmOpen(false);
                void signOut();
              }}
            >
              ログアウト
            </Button>
          </>
        }
      />
    </>
  );
}

// SDK 58 から、ここで宣言したルートだけがタブに出る
function TabsNavigator() {
  const { colors } = useTheme();
  const { submitDirty } = useUnsavedChanges();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.foreground,
        headerTitleStyle: { fontSize: fontSize.base, fontWeight: '600', letterSpacing: tightTracking(fontSize.base) },
        headerRight: () => <LogoutButton />,
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      {/* カレンダーを / にする。未ログイン時に Stack.Protected が戻す先はログイン画面だけにし、
          / ⇄ 保護されたルートのリダイレクトがループしないようにする */}
      <Tabs.Screen
        name="index"
        options={{ title: 'カレンダー', tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="salary"
        options={{ title: '給与計算', tabBarIcon: ({ color, size }) => <Wallet color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="submit"
        options={{
          title: 'シフト管理',
          tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size} />,
          // 未提出の変更がある印。文字は入れず点だけにする
          tabBarBadge: submitDirty ? '' : undefined,
          tabBarBadgeStyle: {
            minWidth: DIRTY_DOT,
            maxHeight: DIRTY_DOT,
            borderRadius: radius.full,
            backgroundColor: colors.destructive,
          },
          tabBarAccessibilityLabel: submitDirty ? 'シフト管理（提出していない変更あり）' : 'シフト管理',
        }}
      />
    </Tabs>
  );
}
