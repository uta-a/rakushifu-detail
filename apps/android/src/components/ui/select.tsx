import { useState } from 'react';
import { FlatList, Modal, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';
import { useTheme } from '@/theme/theme';
import { control, radius, space } from '@/theme/tokens';
import { Text } from './text';

export interface SelectOption<T> {
  value: T;
  label: string;
}

/** 選択肢の1行の高さ。FlatList の getItemLayout で選択中の行へ直接スクロールさせるのに使う */
const OPTION_HEIGHT = control.default;
/** 一覧が画面を覆いきらないよう、表示する行数の上限 */
const MAX_VISIBLE_OPTIONS = 8;

/**
 * Web の <select> の代わり。押すと選択肢の一覧をダイアログで出す。
 * label は読み上げ用（画面に見出しがある前提で、ここでは表示しない）。
 */
export function Select<T extends string | number>({ label, value, options, onChange, disabled, style }: {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const selectedIndex = options.findIndex((o) => o.value === value);
  const current = options[selectedIndex];
  // 一覧に収まらないときだけ、選択中の行が中ほどに来るよう開く位置をずらす。
  // 収まる長さで指定すると、先頭の行が上に隠れたまま開いてしまう
  const overflow = options.length - MAX_VISIBLE_OPTIONS;
  const initialScrollIndex =
    overflow > 0 && selectedIndex > 0
      ? Math.min(Math.max(selectedIndex - Math.floor(MAX_VISIBLE_OPTIONS / 2), 0), overflow)
      : undefined;

  return (
    <>
      <Pressable
        accessibilityRole="combobox"
        accessibilityLabel={label}
        accessibilityValue={{ text: current?.label ?? '' }}
        accessibilityState={{ disabled: !!disabled, expanded: open }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[
          {
            minHeight: control.dense,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: space[1],
            paddingHorizontal: space[2],
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.input,
            backgroundColor: colors.inputBackground,
            opacity: disabled ? 0.5 : 1,
          },
          style,
        ]}
      >
        <Text tabular numberOfLines={1}>
          {current?.label ?? ''}
        </Text>
        <ChevronDown size={14} color={colors.mutedForeground} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <Pressable
          accessibilityLabel="閉じる"
          onPress={() => setOpen(false)}
          style={{ flex: 1, justifyContent: 'center', padding: space[6], backgroundColor: colors.overlay }}
        >
          <View
            style={{
              maxHeight: OPTION_HEIGHT * MAX_VISIBLE_OPTIONS + space[2] * 2,
              paddingVertical: space[2],
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.lg,
              backgroundColor: colors.popover,
            }}
          >
            <FlatList
              data={options}
              keyExtractor={(o) => String(o.value)}
              initialScrollIndex={initialScrollIndex}
              getItemLayout={(_, index) => ({ length: OPTION_HEIGHT, offset: OPTION_HEIGHT * index, index })}
              renderItem={({ item }) => {
                const selected = item.value === value;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      setOpen(false);
                      if (!selected) onChange(item.value);
                    }}
                    style={({ pressed }) => ({
                      height: OPTION_HEIGHT,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: space[4],
                      backgroundColor: pressed ? colors.accent : 'transparent',
                    })}
                  >
                    <Text tabular style={selected ? { fontWeight: '600' } : undefined}>
                      {item.label}
                    </Text>
                    {selected ? <Check size={16} color={colors.foreground} /> : null}
                  </Pressable>
                );
              }}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
