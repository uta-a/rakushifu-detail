import { View } from 'react-native';
import { useTheme } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';
import { Text } from './text';

export function Badge({ variant = 'default', children }: {
  variant?: 'default' | 'secondary' | 'outline';
  children: string;
}) {
  const { colors } = useTheme();
  const surface = {
    default: { backgroundColor: colors.primary, color: colors.primaryForeground, borderColor: 'transparent' },
    secondary: { backgroundColor: colors.secondary, color: colors.secondaryForeground, borderColor: 'transparent' },
    outline: { backgroundColor: 'transparent', color: colors.foreground, borderColor: colors.border },
  }[variant];
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: space[2],
        paddingVertical: 2,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: surface.borderColor,
        backgroundColor: surface.backgroundColor,
      }}
    >
      <Text variant="caption" style={{ color: surface.color, fontWeight: '500' }}>
        {children}
      </Text>
    </View>
  );
}
