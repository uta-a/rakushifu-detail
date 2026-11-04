import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { useTheme } from '@/theme/theme';
import { fontSize, tightTracking } from '@/theme/tokens';

/**
 * design.md の Typography の階層。画面側で fontSize を直書きせず variant で選ぶ。
 * - hero: 画面の主役の数値（給料合計など）。1画面に1つだけ
 * - heading: セクションの主数値（月・時刻）
 * - title: アプリタイトル
 * - cardTitle: Card 見出し
 * - body: 本文・表
 * - caption: 補足
 */
export type TextVariant = 'hero' | 'heading' | 'title' | 'cardTitle' | 'body' | 'caption';
export type TextTone = 'default' | 'muted' | 'destructive' | 'primaryForeground';

const variants: Record<TextVariant, TextStyle> = {
  hero: { fontSize: fontSize['4xl'], fontWeight: '600', letterSpacing: tightTracking(fontSize['4xl']) },
  heading: { fontSize: fontSize.xl, fontWeight: '600', letterSpacing: tightTracking(fontSize.xl) },
  title: { fontSize: fontSize.base, fontWeight: '600', letterSpacing: tightTracking(fontSize.base) },
  cardTitle: { fontSize: fontSize.sm, fontWeight: '600', letterSpacing: tightTracking(fontSize.sm) },
  body: { fontSize: fontSize.sm },
  caption: { fontSize: fontSize.xs },
};

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: TextTone;
  /** 金額・時間・日付に付ける（Web の .tabular） */
  tabular?: boolean;
}

export function Text({ variant = 'body', tone, tabular, style, ...props }: TextProps) {
  const { colors } = useTheme();
  // 補足は既定で muted（Web の text-xs text-muted-foreground）
  const resolvedTone = tone ?? (variant === 'caption' ? 'muted' : 'default');
  const color = {
    default: colors.foreground,
    muted: colors.mutedForeground,
    destructive: colors.destructive,
    primaryForeground: colors.primaryForeground,
  }[resolvedTone];

  return (
    <RNText
      style={[variants[variant], { color }, tabular && { fontVariant: ['tabular-nums'] }, style]}
      {...props}
    />
  );
}
