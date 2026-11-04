import { View } from 'react-native';
import { CircleAlert } from 'lucide-react-native';
import { useTheme } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';
import { Text } from './text';

/** エラー表示。文言は RakushifuError の message など、利用者に見せてよいものだけを渡す */
export function Alert({ variant = 'default', title, children }: {
  variant?: 'default' | 'destructive';
  title?: string;
  children: string;
}) {
  const { colors } = useTheme();
  const tone = variant === 'destructive' ? 'destructive' : 'default';
  return (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: 'row',
        gap: space[3],
        padding: space[4],
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        borderRadius: radius.lg,
      }}
    >
      <CircleAlert size={16} color={variant === 'destructive' ? colors.destructive : colors.foreground} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, gap: space[1] }}>
        {title ? (
          <Text tone={tone} style={{ fontWeight: '500' }}>
            {title}
          </Text>
        ) : null}
        <Text tone={tone}>{children}</Text>
      </View>
    </View>
  );
}
