import { TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '@/theme/theme';
import { control, fontSize, radius, space } from '@/theme/tokens';
import { Text } from './text';

export interface InputProps extends TextInputProps {
  label: string;
}

/** ラベル付きの入力。label は読み上げにも使うので必須 */
export function Input({ label, editable = true, style, ...props }: InputProps) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: space[2] }}>
      <Text style={{ fontWeight: '500' }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        editable={editable}
        placeholderTextColor={colors.mutedForeground}
        style={[
          {
            minHeight: control.default,
            paddingHorizontal: space[3],
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.input,
            backgroundColor: colors.inputBackground,
            color: colors.foreground,
            fontSize: fontSize.base,
            opacity: editable ? 1 : 0.5,
          },
          style,
        ]}
        {...props}
      />
    </View>
  );
}
