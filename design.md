# Design — らくしふツール

このアプリの確定したデザインシステム。画面を追加・変更するときは、まずこのファイルを読む。
ページごとにテーマを選び直さない（アプリ内では一貫性が正義で、多様性は不要）。

## Genre

modern-minimal（shadcn/ui の系譜）。情報密度の高い業務画面で、数値が主役。
装飾は足さず、境界線と余白で構造を作る。

## Macrostructure

3タブとも **Workbench**。共通の骨格は次のとおり。

```
sticky header（タイトル + テーマ切替 / segmented control タブ）
└ main（max-w-3xl・px-4）
   └ 操作行（月送り or 日付選択 or 設定）
   └ Card 群（space-y-5）
```

タブごとに変えてよいのは Card の中身だけ。ヘッダー・余白・Card の見た目は共通。

## Theme

shadcn/ui neutral（OKLCH）。値の定義は `src/index.css` の `:root` / `.dark` /
`@media (prefers-color-scheme: dark)` の3ブロックが唯一の出所。

| トークン | light | dark |
| --- | --- | --- |
| `--background` | `oklch(1 0 0)` | `oklch(0.145 0 0)` |
| `--foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` |
| `--card` | `oklch(1 0 0)` | `oklch(0.205 0 0)` |
| `--popover` | `oklch(1 0 0)` | `oklch(0.269 0 0)` |
| `--primary` | `oklch(0.205 0 0)` | `oklch(0.922 0 0)` |
| `--muted` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` |
| `--muted-foreground` | `oklch(0.556 0 0)` | `oklch(0.708 0 0)` |
| `--destructive` | `oklch(0.577 0.245 27.325)` | `oklch(0.704 0.191 22.216)` |
| `--border` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 12%)` |
| `--input` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 18%)` |
| `--input-background` | `oklch(1 0 0)` | `oklch(1 0 0 / 6%)` |
| `--ring` | `oklch(0.708 0 0)` | `oklch(0.556 0 0)` |
| `--sunday` | `oklch(0.55 0.14 25)` | `oklch(0.7 0.15 25)` |
| `--saturday` | `oklch(0.52 0.09 250)` | `oklch(0.72 0.1 250)` |

### 色のルール

- **primary はニュートラル黒**。選択状態・主ボタンはすべてこれ。
- **有彩色は3つだけ**: `destructive`（エラー）、`sunday`、`saturday`。
- 意味の区別を色で持たせない。深夜割増・フロア・キッチンなどは
  **アイコン・Badge・`text-muted-foreground` の濃淡**で表す。
- コンポーネントに生の色値（`bg-blue-600` など Tailwind 既定パレット含む）を書かない。
  必ず意味トークン（`bg-primary` `text-muted-foreground`）を参照する。

### ダークモード

`.dark` / `.light` クラス（明示選択）と `prefers-color-scheme`（OS設定）の両方に対応。
状態は `localStorage['rakushifu-theme']` に `light | dark | system` で保存する。

- OS 設定のみのユーザーは `@media (prefers-color-scheme: dark)` が受け持つ（`.light` があると打ち消される）。
- 明示選択のユーザーは `public/theme-init.js` が最初の描画前にクラスを付ける。
  CSP はインラインスクリプトを禁じているが `default-src 'self'` は同一オリジンの
  外部 JS を許可するため、この形なら初回のちらつきが出ない。
  **`src/lib/theme.ts` の `applyTheme` / `readStoredTheme` と挙動を必ず揃えること。**
- ダークのトークンは `.dark` と `@media` に2重定義されている（CSS が @media 内外で
  セレクタを共有できないため）。**片方だけ書き換えないこと。**
- `dark:` ユーティリティを使う場合は `index.css` の `@custom-variant dark` が
  OS 設定でも発火する形になっていることを前提にする。原則はトークンだけで表現し、
  `dark:` は使わない。

## Typography

- 欧文・数字: **Inter** 400 / 500 / 600 / 700
- 和文: **Noto Sans JP** 400 / 500 / 700
- スタック: `"Inter", "Noto Sans JP", ui-sans-serif, system-ui, sans-serif`
- 見出しは常に roman（italic 禁止）。

### 階層（1画面に「一番大きい文字」は1つだけ）

| 役割 | クラス |
| --- | --- |
| 画面の主役の数値（給料合計など） | `text-4xl font-semibold tracking-tight tabular` |
| セクションの主数値（月・時刻） | `text-xl` 〜 `text-2xl font-semibold tracking-tight` |
| アプリタイトル | `text-base font-semibold tracking-tight` |
| Card 見出し | `text-sm font-semibold tracking-tight`（`CardTitle` は muted） |
| 本文・表 | `text-sm` |
| 補足 | `text-xs text-muted-foreground` |

### 数値

金額・時間・日付を出す要素には必ず `.tabular` を付ける
（`font-variant-numeric: tabular-nums`）。桁の揺れを防ぐ。

## Spacing / Radius

- `--radius: 0.625rem`。Card = `rounded-lg`、ボタン・入力 = `rounded-md`、
  Badge・丸印 = `rounded-full`。この3段階以外を使わない。
- Card 間は `space-y-5`。Card 内パディングは `CardContent` の `padding` プロップで選ぶ
  （`default` / `below-header` / `none`）。**className に `p-*` を渡さない**
  — `cn()` は tailwind-merge を通さない単純結合なので、生成CSSの並び順で
  `sm:p-6` が後勝ちし、意図した値が効かない。
- タップ領域は最小 44px（`h-11`）。密度優先の箇所のみ `h-9`。
  ヘッダー内の補助的なアイコン群（`ThemeToggle`）のみ `h-8` を許容する。

## Surface

面の言語は1つだけ。

```
border + bg-card + rounded-lg（影なし）
```

`shadow-lg` は使わない。影は「浮いているもの」（Popover = `shadow-md`、
segmented control の選択タブ = `shadow-xs`）に限る。

## Motion

- `transition-colors duration-150 ease-out`。`--ease-out` は `@theme inline` で
  `cubic-bezier(0.16, 1, 0.3, 1)` に上書きしてある。
  **`ease-[--ease-out]` とは書かない** — Tailwind v4 では無効な CSS を吐き、
  `transition-timing-function` が既定の `ease` に落ちる。
- reveal / スクロールアニメーションは使わない。アプリ画面はモーションを足さない。
- `prefers-reduced-motion: reduce` で全アニメーションを実質無効化（`index.css` に定義済み）。

## States

すべてのインタラクティブ要素に必須。

- `:focus-visible` → `focus-visible:ring-[3px] focus-visible:ring-ring/50`。
  リングはアニメーションさせない。
- `disabled` → `disabled:opacity-50 disabled:pointer-events-none`。
- 読み込み中 → **Skeleton**（スピナーは使わない）。高さを保ち、画面を跳ねさせない。
  Skeleton は空の `div` で読み上げ対象が無いため、必ず `SkeletonGroup` で包んで
  `label` を渡す（`aria-busy` と sr-only テキストが付く）。
  例外はボタン内の送信中表示のみ（`LoginForm` の `Loader2`）。ボタンの幅は変えない。
- エラー → `Alert variant="destructive"`。文言をベタ書きしない。
- 空状態 → Card 内に lucide アイコン + 1行の説明（`min-h-32` で高さを揃える）。

## Components

`src/components/ui/` が唯一のプリミティブ置き場。新しい見た目が必要になったら、
画面側で className を組むのではなく、ここに variant を足す。

| ファイル | 役割 |
| --- | --- |
| `button.tsx` | variant: default / secondary / outline / ghost / destructive、size: default / sm / lg / icon |
| `card.tsx` | Card / CardHeader / CardTitle（`as` で h2・h3）/ CardContent（`padding` プロップ） |
| `input.tsx` `label.tsx` | フォーム |
| `tabs.tsx` | segmented control。manual activation（矢印はフォーカス移動のみ、Enter/Space/クリックで確定）。タブ切り替えのたびに API を叩くため automatic activation は使わない |
| `alert.tsx` | Alert / AlertTitle / AlertDescription |
| `skeleton.tsx` | Skeleton（プレースホルダ）と SkeletonGroup（読み上げラベル付きの包み） |
| `badge.tsx` | default / secondary / outline |
| `popover.tsx` | Esc・外側クリックで閉じ、フォーカスをトリガーに戻す。`label` 必須。トリガーは props を DOM の `<button>` に展開するコンポーネントを渡すこと |

共通コンポーネント（`ui/` の外）:

- `MonthNav.tsx` — カレンダーと給料計算で共有する月送り。**画面ごとに作り直さない。**
  その月が画面の主対象なら `as="h2"` を渡して見出しにする。
- `ThemeToggle.tsx` — ライト / ダーク / OS設定の radiogroup。

## Icons

**lucide-react** のみ。`size-4`（本文内）/ `size-6`（空状態）を基本とし、
装飾目的のアイコンには `aria-hidden="true"` を付ける。
Material Symbols は使わない（撤去済み）。

## 依存の方針

shadcn/ui の CLI・Radix UI・CVA・tailwind-merge は導入しない。
トークンと薄いプリミティブだけを自前で持ち、外部依存は `lucide-react` のみに保つ。
Radix が必要になるほど複雑な要件（複数レイヤーの Dialog、仮想リストの Combobox 等）が
出てきた時点で、改めてこのファイルを更新して判断する。

## 画面が共有しなければならないもの

- ヘッダーの構造（タイトル + ThemeToggle + segmented control タブ）
- Card の見た目（border + bg-card + rounded-lg、影なし）
- primary の色と使いどころ（選択状態・主ボタンのみ）
- タイポの階層と `.tabular`
- Skeleton / Alert / 空状態の型

## 画面ごとに変えてよいもの

- Card の中身の構成（表・リスト・グリッド）
- lucide アイコンの選択
- Card の並び順と数
