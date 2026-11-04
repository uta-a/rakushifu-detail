import { Pressable } from 'react-native';
import { Tabs } from 'expo-router';
import { CalendarDays, ClipboardList, LogOut, Wallet } from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/theme/theme';
import { control, fontSize, tightTracking } from '@/theme/tokens';

// SDK 58 から、ここで宣言したルートだけがタブに出る
export default function TabsLayout() {
  const { colors } = useTheme();
  const { signOut } = useAuth();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.foreground,
        headerTitleStyle: { fontSize: fontSize.base, fontWeight: '600', letterSpacing: tightTracking(fontSize.base) },
        headerRight: () => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="ログアウト（この端末から認証情報を削除）"
            onPress={signOut}
            style={{ width: control.default, height: control.default, alignItems: 'center', justifyContent: 'center' }}
          >
            <LogOut size={16} color={colors.mutedForeground} />
          </Pressable>
        ),
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="calendar"
        options={{ title: 'カレンダー', tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="salary"
        options={{ title: '給与計算', tabBarIcon: ({ color, size }) => <Wallet color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="submit"
        options={{ title: 'シフト管理', tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size} /> }}
      />
    </Tabs>
  );
}
