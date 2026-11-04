import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { useTheme } from '@/theme/theme';
import { space } from '@/theme/tokens';

/** タブ画面の共通の器。Web の main（px-4・Card 間 space-y-5）に合わせる */
export function Screen({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: space[4], gap: space[5] }}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}
