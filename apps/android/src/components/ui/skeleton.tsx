import { View, type DimensionValue, type ViewProps } from 'react-native';
import { useTheme } from '@/theme/theme';
import { radius } from '@/theme/tokens';

/** 読み込み中のプレースホルダ。スピナーは使わない。必ず SkeletonGroup で包む */
export function Skeleton({ width = '100%', height }: { width?: DimensionValue; height: number }) {
  const { colors } = useTheme();
  return <View style={{ width, height, borderRadius: radius.md, backgroundColor: colors.muted }} />;
}

/** Skeleton は読み上げ対象が無いので、まとめて label を読ませる */
export function SkeletonGroup({ label, style, ...props }: ViewProps & { label: string }) {
  return (
    <View
      accessible
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      style={[{ gap: 8 }, style]}
      {...props}
    />
  );
}
