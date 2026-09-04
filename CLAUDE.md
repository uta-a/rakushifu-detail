# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 概要

すかいらーくグループのシフト管理サイト「らくしふ」から確定シフトを取得し、予定通り働いた場合の給料を計算するWebアプリ。フロントは React + Vite のSPA、バックエンドは Vercel Serverless Functions（`api/`）で、らくしふAPIへの認証プロキシ・APIプロキシとして機能する。

## コマンド

```bash
npm run dev          # Vite開発サーバー起動
npm run build        # tsc -b で型チェック後、vite build
npm run lint         # ESLint
npm test             # Vitest（1回実行）
npm run test:watch   # Vitest（watch）
npx vitest run src/utils/salaryCalculator.test.ts   # 単一テストファイル実行
```

デプロイは Vercel（`npx vercel`）。

ローカルで API 込みの動作確認をするには、2つのプロセスを並行して起動する。

```bash
npx vercel dev --listen 3001   # api/ の Serverless Functions（ポートは固定）
npm run dev                    # フロント。/api/* は 3001 にプロキシされる
```

ブラウザで開くのは `npm run dev` 側（既定 5173）。`vercel dev` 単体でフロントも見ようとすると、`vercel.json` の SPA フォールバック（`/((?!api/).*)` → `/index.html`）が Vite の dev アセット（`/src/*`, `/@vite/*`）まで書き換えてしまい、Vite が HTML を JS としてパースしようとして落ちる。本番では Vercel がファイルシステムを rewrites より先に見るためこの問題は起きない。`--listen 3001` は `vite.config.ts` の `server.proxy` の転送先と一致させること。

## アーキテクチャ

### 認証・データ取得のフロー

らくしふには公式APIキーがないため、ブラウザのログインフローを Serverless Function で代行している。CORSとクレデンシャルの都合上、フロントから直接らくしふを叩けないため、必ず `api/` のプロキシ経由になる。

1. `api/login.ts` — 従業員ID/パスワードを受け取り、(1) らくしふ認証API（`api.accounts.rakushifu.com`）でログインして `xbit_at` 等のcookieを取得、(2) enterpriseドメインでセッションを確立し、統合したcookie文字列をフロントに返す。
2. フロントは受け取ったcookie文字列を `sessionStorage`（キー `rakushifu-cookies`）に保存。`App.tsx` はこのキーの有無でログイン状態を判定する。
3. `useShifts` フックがシフト取得時、cookieを `X-Rakushifu-Cookies` ヘッダーに載せて `/api/shifts` を呼ぶ。
4. `api/shifts.ts` — cookieを使って `skylark.enterprise.rakushifu.com` の確定シフトAPIを叩き、レスポンスをそのまま返す。ブラウザ由来のリクエストに見せるため User-Agent / Referer を偽装している。

cookie はサーバーに保存せずフロントの sessionStorage のみで保持し、リクエストごとにヘッダーで渡す構造。認証情報を扱うため `api/` の入力バリデーション（型・長さチェック）は維持すること。

### 給料計算ロジック

`src/utils/salaryCalculator.ts` に集約。UIから独立した純粋関数で、ここが唯一のテスト対象（`salaryCalculator.test.ts`）。

- 深夜割増は 22:00〜翌5:00 を x1.25。`calcLateNightMinutes` が日跨ぎシフト（例 22:00〜02:00）を含めて深夜該当分を分単位で算出する。ロジック変更時は日跨ぎ・深夜境界のケースを必ずテストで担保する。
- `calcShiftDetail` が1シフトの通常/深夜時間を、`calcMonthlySalary` が月間合計と給料（通常給・深夜給・交通費）を計算する。給料は `Math.floor` で円未満切り捨て。
- 未対応: 休憩時間（`rest_times`）の控除。形式が不明なためTODOのまま総勤務時間から差し引いていない。

### デザインシステム

`design.md`（リポジトリ直下）が唯一の情報源。UIを触る前に必ず読むこと。

- shadcn/ui neutral のトークンを `src/index.css` の `:root` / `.dark` /
  `@media (prefers-color-scheme: dark)` に定義。コンポーネントは意味トークン
  （`bg-primary`, `text-muted-foreground` 等）だけを参照し、`bg-blue-600` のような
  Tailwind 既定パレットを直書きしない。
- プリミティブは `src/components/ui/`（button, card, input, label, tabs, alert,
  skeleton, badge, popover）。新しい見た目が要るときは画面側で className を組まず、
  ここに variant を足す。
- 外部依存は `lucide-react` のみ。Radix UI / CVA / tailwind-merge は入れない。
- 読み込み中は Skeleton（スピナーは使わない）、エラーは `Alert variant="destructive"`。
- 金額・時間を出す要素には `.tabular` を付ける。

### フロント構成

- `App.tsx` — ログイン状態による `LoginForm` / `MainTabs` の出し分けのみ。ルーターは無し。
- `pages/Dashboard.tsx` — 月切り替え・設定・シフト表・給料サマリを束ねる。年月stateが変わると `useEffect` で再取得。
- 時給・交通費の設定（`Settings`）はブラウザに保存。デフォルトは時給1200円・交通費0円。
- 型は `src/types/shift.ts` に集約。らくしふAPIのレスポンス型（`ShiftApiResponse` 等）とアプリ内部型（`ShiftDetail`, `SalaryResult`）を分けている。

## 注意点

- らくしふの非公開APIに依存しているため、エンドポイントやcookie名（`xbit_at`）、レスポンス構造が変わると壊れる。`api/` を触るときはらくしふ側の仕様変更を疑う。
- `vercel.json` にCSP等のセキュリティヘッダーを設定済み。`connect-src 'self'` のため外部への直接fetchは不可（プロキシ前提の制約）。フロントで外部リソースを増やす場合はCSPも更新する。
