import { Switch as RNSwitch, type SwitchProps } from 'react-native';
import { useTheme } from '@/theme/theme';

/** オン・オフ。オンは primary、オフは input の色（Web の Checkbox 系と同じ規則） */
export function Switch({ accessibilityLabel, ...props }: SwitchProps & { accessibilityLabel: string }) {
  const { colors } = useTheme();
  return (
    <RNSwitch
      accessibilityLabel={accessibilityLabel}
      trackColor={{ false: colors.input, true: colors.primary }}
      thumbColor={props.value ? colors.primaryForeground : colors.mutedForeground}
      ios_backgroundColor={colors.input}
      {...props}
    />
  );
}
