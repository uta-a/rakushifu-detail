import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/theme';
import { control, radius, space } from '@/theme/tokens';
import { Text } from './text';

export type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  variant?: ButtonVariant;
  /** 密度優先の箇所だけ dense（36px）。既定は 44px */
  dense?: boolean;
  children: string;
  style?: StyleProp<ViewStyle>;
}

export function Button({ variant = 'default', dense, disabled, children, style, ...props }: ButtonProps) {
  const { colors } = useTheme();
  const surface = {
    default: { backgroundColor: colors.primary, color: colors.primaryForeground, borderColor: 'transparent' },
    secondary: { backgroundColor: colors.secondary, color: colors.secondaryForeground, borderColor: 'transparent' },
    outline: { backgroundColor: 'transparent', color: colors.foreground, borderColor: colors.border },
    ghost: { backgroundColor: 'transparent', color: colors.foreground, borderColor: 'transparent' },
    destructive: {
      backgroundColor: colors.destructive,
      color: colors.destructiveForeground,
      borderColor: 'transparent',
    },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      style={({ pressed }) => [
        {
          minHeight: dense ? control.dense : control.default,
          paddingHorizontal: space[4],
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: surface.borderColor,
          backgroundColor: pressed && variant !== 'default' ? colors.accent : surface.backgroundColor,
          alignItems: 'center',
          justifyContent: 'center',
          // disabled:opacity-50
          opacity: disabled ? 0.5 : pressed && variant === 'default' ? 0.9 : 1,
        },
        style,
      ]}
      {...props}
    >
      <Text style={{ color: surface.color, fontWeight: '500' }}>{children}</Text>
    </Pressable>
  );
}
