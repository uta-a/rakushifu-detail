import { View, type ViewProps } from 'react-native';
import { useTheme } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';
import { Text } from './text';

/** 面の言語は1つだけ: border + bg-card + rounded-lg（影なし） */
export function Card({ style, ...props }: ViewProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: radius.lg },
        style,
      ]}
      {...props}
    />
  );
}

export function CardHeader({ style, ...props }: ViewProps) {
  return <View style={[{ paddingHorizontal: space[4], paddingTop: space[4], gap: space[1] }, style]} {...props} />;
}

/** Card 見出し。Web の CardTitle と同じく muted */
export function CardTitle({ children }: { children: string }) {
  return (
    <Text variant="cardTitle" tone="muted" accessibilityRole="header">
      {children}
    </Text>
  );
}

/** padding は Web の CardContent と同じ3択。ほかの値にするときは none にして style で渡す */
export function CardContent({
  padding = 'default',
  style,
  ...props
}: ViewProps & { padding?: 'default' | 'below-header' | 'none' }) {
  const value = {
    default: { padding: space[4] },
    'below-header': { paddingHorizontal: space[4], paddingBottom: space[4], paddingTop: space[3] },
    none: {},
  }[padding];
  return <View style={[value, style]} {...props} />;
}
