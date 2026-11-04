type ClassValue = string | number | null | undefined | false | ClassValue[];

/**
 * className を結合する最小ヘルパー。
 * clsx/tailwind-merge は入れず、後勝ちが必要な箇所は呼び出し側で
 * 競合するクラスを渡さない方針にする（primitives 側は variant で吸収する）。
 */
export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  for (const input of inputs) {
    if (!input) continue;
    if (Array.isArray(input)) {
      const nested = cn(...input);
      if (nested) out.push(nested);
    } else {
      out.push(String(input));
    }
  }
  return out.join(' ');
}
