// design.md の Spacing / Radius / Typography を RN の数値に置き換えたもの。
// 画面側は生の数値を書かず、ここを参照する。

/** --radius: 0.625rem を基準にした3段階だけを使う */
export const radius = {
  /** Card・Dialog（rounded-lg） */
  lg: 10,
  /** ボタン・入力（rounded-md） */
  md: 8,
  /** Badge・丸印（rounded-full） */
  full: 9999,
} as const;

/** Tailwind の 4px 刻みに合わせる */
export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
} as const;

/** タップ領域は最小 44px（h-11）。密度優先の箇所のみ 36px（h-9） */
export const control = {
  default: 44,
  dense: 36,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  xl: 20,
  '2xl': 24,
  '4xl': 36,
} as const;

/** tracking-tight（-0.025em）を px に直したもの。サイズに比例させる */
export function tightTracking(size: number): number {
  return size * -0.025;
}
