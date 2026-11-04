// apps/web/src/index.css の :root / .dark にある OKLCH のトークンを sRGB に変換し、
// src/theme/colors.ts を生成する。RN は OKLCH を解釈できないため。
// 使い方: npm run gen:theme -w @rakushifu/android
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const cssPath = fileURLToPath(new URL('../../web/src/index.css', import.meta.url));
const outPath = fileURLToPath(new URL('../src/theme/colors.ts', import.meta.url));
const css = readFileSync(cssPath, 'utf8');

function readBlock(selector) {
  const match = css.match(new RegExp(`\\n${selector}\\s*\\{([\\s\\S]*?)\\n\\}`));
  if (!match) throw new Error(`${selector} が見つかりません`);
  return Object.fromEntries(
    [...match[1].matchAll(/--([\w-]+):\s*(oklch\([^)]*\))/g)].map((m) => [m[1], m[2]]),
  );
}

// https://bottosson.github.io/posts/oklab/ の OKLab → linear sRGB
function oklchToCss(value) {
  const nums = value.match(/[\d.]+%?/g);
  const [L, C, H] = nums.slice(0, 3).map(Number);
  const alpha = nums[3] ? parseFloat(nums[3]) / 100 : 1;
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  const [r, g, bl] = linear.map((x) => {
    const c = Math.min(1, Math.max(0, x));
    return Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055));
  });
  if (alpha === 1) return `#${[r, g, bl].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
  return `rgba(${r}, ${g}, ${bl}, ${alpha})`;
}

const camel = (key) => key.replace(/-(\w)/g, (_, c) => c.toUpperCase());
const light = readBlock(':root');
const dark = readBlock('\\.dark');
const keys = Object.keys(light).filter((k) => k in dark);
const lines = (tokens) => keys.map((k) => `  ${camel(k)}: '${oklchToCss(tokens[k])}',`).join('\n');

writeFileSync(
  outPath,
  `// 生成ファイル。手で書き換えないこと（scripts/gen-theme.mjs）。
// 出所は apps/web/src/index.css の :root / .dark（OKLCH を sRGB に変換した値）。
export const lightColors = {
${lines(light)}
} as const;

export type ThemeColors = { [K in keyof typeof lightColors]: string };

export const darkColors: ThemeColors = {
${lines(dark)}
};
`,
);
console.log(`${outPath} を生成しました（${keys.length} トークン）`);
