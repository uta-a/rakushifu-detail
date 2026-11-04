import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useTheme } from '@/theme/theme';
import { space } from '@/theme/tokens';

/**
 * タブ画面の共通の器。Web の main（px-4・Card 間 space-y-5）に合わせる。
 * footer はスクロールの外、タブバーの直上に固定する（Web の sticky bottom-0 の提出バー）。
 */
export function Screen({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: space[4], gap: space[5] }}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
      {footer ? (
        <View
          style={{
            paddingHorizontal: space[4],
            paddingVertical: space[3],
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.background,
          }}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
}
