import { Pressable, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { shiftMonth } from '@rakushifu/core';
import { useTheme } from '@/theme/theme';
import { control, radius, space } from '@/theme/tokens';
import { Text } from './ui/text';

/** クライアントが受け付ける年の範囲。範囲外へは移動させない */
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

function NavButton({ direction, disabled, onPress }: {
  direction: 'prev' | 'next';
  disabled: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const Icon = direction === 'prev' ? ChevronLeft : ChevronRight;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={direction === 'prev' ? '前の月' : '次の月'}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: control.default,
        height: control.default,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? colors.accent : 'transparent',
        opacity: disabled ? 0.5 : 1,
      })}
    >
      <Icon size={16} color={colors.foreground} />
    </Pressable>
  );
}

/** カレンダーと給与計算で共有する月送り。両画面で見た目と操作を揃える */
export function MonthNav({ year, month, onMove }: {
  year: number;
  month: number;
  onMove: (delta: number) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2] }}>
      <NavButton direction="prev" disabled={shiftMonth(year, month, -1).year < MIN_YEAR} onPress={() => onMove(-1)} />
      <View accessible accessibilityRole="header" accessibilityLabel={`${year}年${month}月`} style={{ alignItems: 'center' }}>
        <Text variant="caption" tabular>
          {year}年
        </Text>
        <Text variant="heading" tabular>
          {month}月
        </Text>
      </View>
      <NavButton direction="next" disabled={shiftMonth(year, month, 1).year > MAX_YEAR} onPress={() => onMove(1)} />
    </View>
  );
}
