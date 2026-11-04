# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 概要

すかいらーくグループのシフト管理サイト「らくしふ」から確定シフトを取得し、予定通り働いた場合の給料を計算するWebアプリ。フロントは React + Vite のSPA、バックエンドは Vercel Serverless Functions（`api/`）で、らくしふAPIへの認証プロキシ・APIプロキシとして機能する。

## コマンド

npm workspaces の monorepo。Web版は `apps/web`（`@rakushifu/web`）、Android版は `apps/android`（`@rakushifu/android`、Expo）、UI から独立した型と純粋関数とらくしふクライアントは `packages/core`（`@rakushifu/core`）にある。ルートのスクリプトは各 workspace に委譲する。

core の `exports` は条件で分けている。Vite・Vitest・tsc（Metro も）は `rakushifu-source` 条件で `src/index.ts` を直接読み（条件名を `source` のような一般的な名前にすると、同名の条件を exports に持つ他のパッケージまで未ビルドのソースに解決されるため、専用の名前にしている）、Node（Vercel Functions）は `tsc -p tsconfig.build.json` で出した `dist/` を読む。Vercel は依存先の TS をコンパイルしても import の `.ts` を書き換えないため、src のままでは本番の関数が起動しない。`vercel.json` の `buildCommand` で core を先にビルドしている。ローカルで `vercel dev` を使う前にも `npm run build -w @rakushifu/core` が要る。core 内の相互 import には `.ts` 拡張子を付け（ビルド時に `.js` へ書き換わる）、`erasableSyntaxOnly` を守る（enum を使わない）。DOM・Node・React Native 固有の API には依存させない（`tsconfig.json` の `lib` は ES2023 のみ）。

```bash
npm run dev          # Vite開発サーバー起動
npm run build        # tsc -b で型チェック後、vite build
npm run lint         # ESLint
npm test             # Vitest（1回実行）
npm run test:watch   # Vitest（watch）
npm test -w @rakushifu/core -- src/utils/salaryCalculator.test.ts   # 単一テストファイル実行
npm run android -w @rakushifu/android   # Expo の開発サーバー（Android）
npm run doctor -w @rakushifu/android    # expo-doctor で依存と設定を診断
```

**React は Web と Android で同じバージョンに固定する。** Expo の SDK は react を固定バージョンで要求し、npm workspaces で React が2つに割れるとフックが壊れる（Web のテストが大量に落ちる、バンドルが不自然に膨らむ）。`apps/web` の `react` / `react-dom` は Expo の SDK が要求する版ちょうどにしてあり、SDK を上げるときは両方を揃えて上げること。Android への依存追加は `npm install` ではなく `npx expo install`（`apps/android` で実行）を使い、SDK に合う版を入れる。

デプロイは Vercel（`apps/web` で `npx vercel`）。Vercel の Root Directory は `apps/web`。

ローカルで API 込みの動作確認をするには、2つのプロセスを並行して起動する。

```bash
npm run build -w @rakushifu/core              # api/ が読む core の dist を作る
cd apps/web && npx vercel dev --listen 3001   # api/ の Serverless Functions（ポートは固定）
npm run dev                    # フロント。/api/* は 3001 にプロキシされる
```

ブラウザで開くのは `npm run dev` 側（既定 5173）。`vercel dev` 単体でフロントも見ようとすると、`vercel.json` の SPA フォールバック（`/((?!api/).*)` → `/index.html`）が Vite の dev アセット（`/src/*`, `/@vite/*`）まで書き換えてしまい、Vite が HTML を JS としてパースしようとして落ちる。本番では Vercel がファイルシステムを rewrites より先に見るためこの問題は起きない。`--listen 3001` は `vite.config.ts` の `server.proxy` の転送先と一致させること。

## アーキテクチャ

### 認証・データ取得のフロー

らくしふには公式APIキーがないため、ブラウザのログインフローを Serverless Function で代行している。CORSとクレデンシャルの都合上、フロントから直接らくしふを叩けないため、必ず `api/` のプロキシ経由になる。

らくしふへの手順そのものは `packages/core/src/api/client.ts`（`createRakushifuClient`）にあり、Web版と Android版で共有する。`api/*.ts` は「入力検証 → `CookieSession` を作る → クライアントを呼ぶ → `RakushifuError` を HTTP ステータスに戻す（`api/_lib/http.ts`）」だけの薄い層。cookie とリダイレクトの扱いは `RakushifuSession` の実装で差し替える（Web版は cookie 文字列を自前で持ち、リダイレクトを追わない `CookieSession`）。`api/` 内の相対 import は Node の ESM で解決できるよう `.js` で書く。

1. `api/login.ts` — 従業員ID/パスワードを受け取り、クライアントの `login` で(1) らくしふ認証API（`api.accounts.rakushifu.com`）でログインして `xbit_at` 等のcookieを取得、(2) enterpriseドメインでセッションを確立し、統合したcookie文字列をフロントに返す。
2. フロントは受け取ったcookie文字列を `sessionStorage`（キー `rakushifu-cookies`）に保存。`App.tsx` はこのキーの有無でログイン状態を判定する。
3. `useShifts` フックがシフト取得時、cookieを `X-Rakushifu-Cookies` ヘッダーに載せて `/api/shifts` を呼ぶ。
4. `api/shifts.ts` — cookieを使って `skylark.enterprise.rakushifu.com` の確定シフトAPIを叩き、レスポンスをそのまま返す。ブラウザ由来のリクエストに見せるため、クライアントが User-Agent / Referer を偽装している。

cookie はサーバーに保存せずフロントの sessionStorage のみで保持し、リクエストごとにヘッダーで渡す構造。認証情報を扱うため `api/` の入力バリデーション（型・長さチェック）は維持すること。

### 希望シフトの提出

確定シフト（`/ajax/*`）とは別系統の `/typed/api/staff/*` を使う。`api/` は3本。

1. `api/submit-context.ts` — 提出期間（`user_submit_terms`）・提出先店舗（時刻の刻みと入力可能な時間帯）・基本シフト・勤務可能時間帯・休み希望の上限・所属職種を、1往復にまとめて返す。画面を開いた時点で全部必要なため。
2. `api/desired-shifts.ts` — 指定期間の提出済み希望シフト。
3. `api/submit-shifts.ts` — 提出（upsert）。

**upsert は期間を丸ごと置き換える。** 期間内の全日付を送る必要があり、希望を出さない日は `desired_schedule: null` を送る。日を落とすと、その日の提出済みの希望が消える。`toUpsertPayload`（`packages/core/src/utils/shiftSubmit.ts`）がこの不変条件を担保しているので、ここを変えるときはテストを必ず見ること。

**CSRF が必要。** らくしふの更新系は Rails の CSRF 保護下にあり、提出ページの HTML に埋め込まれた `data-csrf-token` を `X-CSRF-Token` で送る。トークンはセッションと対なので、クライアントの `submitShifts` は「提出ページを GET → トークン抽出 → その GET で回転した `_Rakushifu_session` で POST」する（差し替えはセッション側が Set-Cookie を取り込んで行う）。唯一の更新系なので、受け取った値はそのまま中継せず、`sanitizeShifts`（`packages/core/src/api/sanitize.ts`）で許可キーだけを検証して詰め替えている。

**初期値を入れるのは未提出の期間だけ。** 公式は未提出の期間に限り、勤務可能時間帯（無ければ基本シフト）を店舗の入力可能範囲でクランプしたものを既定値として全日に入れる。提出済みの期間では空欄のままにする。ここを取り違えると、希望を出さないことにした日が出勤希望として復活する。

ロジックは `packages/core/src/utils/shiftSubmit.ts` に集約（`salaryCalculator.ts` と同じく UI から独立した純粋関数）。

### 給料計算ロジック

`packages/core/src/utils/salaryCalculator.ts` に集約。UIから独立した純粋関数（`salaryCalculator.test.ts`）。

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
- `pages/MainTabs.tsx` — タブは カレンダー / 給与計算 / シフト管理 の3つ。`active` state による条件レンダリングで出し分ける。シフト管理タブに未提出の変更があるときは、タブ移動を Dialog で引き止める（タブを移るとアンマウントで失われるため）。
- `pages/ShiftCalendar.tsx` — 月グリッド + 選択日の詳細 + `DayOverlap`（その日に同じ時間へ入る人）。かぶりは選択日に連動し、専用の日付入力は持たない。
- `pages/Dashboard.tsx` — 月切り替え・設定・シフト表・給料サマリを束ねる。年月stateが変わると `useEffect` で再取得。
- 時給・交通費の設定（`Settings`）はブラウザに保存。デフォルトは時給1200円・交通費0円。
- 型は `packages/core/src/types/shift.ts` に集約。らくしふAPIのレスポンス型（`ShiftApiResponse` 等）とアプリ内部型（`ShiftDetail`, `SalaryResult`）を分けている。

### Android版

`apps/android` は Expo SDK 58（expo-router、TanStack Query、expo-secure-store）。iOS・Web・Play ストア公開は対象外。

- 端末から直接らくしふを叩く（Vercel を経由しない）。core のクライアントに `NativeJarSession`（`src/lib/session.ts`）を渡し、cookie は OS の cookie jar に任せる。RN の fetch では `redirect: 'manual'` が効かないため、セッション切れは最終 URL で判定する。
- 従業員ID・パスワードは `expo-secure-store` だけに保存する（AsyncStorage やログに書かない、`allowBackup: false`）。らくしふの取得は必ず `useAuth().call` を通す。401 のときに保存した認証情報で一度だけ再ログインし、それでも 401 ならログイン画面へ戻す。
- ルートは `src/app`。認証の出し分けは `_layout.tsx` の `Stack.Protected`、タブは `(tabs)/_layout.tsx` で宣言したものだけが出る（SDK 58 の仕様）。
- スタイルは NativeWind を使わず StyleSheet。色は `src/theme/colors.ts`（`apps/web/src/index.css` の OKLCH から `npm run gen:theme -w @rakushifu/android` で生成。手で書き換えない）、余白・角丸・文字サイズは `src/theme/tokens.ts`。画面は `src/components/ui/` のプリミティブと `Text` の `variant` だけを使い、生の色値や数値を書かない。
- 画面は Web版と同じ3タブ（`(tabs)/index.tsx` カレンダー、`salary.tsx` 給与計算、`submit.tsx` シフト管理）。取得は `src/hooks/` の TanStack Query（キーは `['confirmed', y, m]`・`['store-shifts', storeId, date]`・`['submit-context']`・`['desired', start, end]`）。提出は mutation で、成功したら `submit-context` と `desired` を無効化する。提出画面は取り直しで編集中の内容を上書きしない。
- Web版と違い、シフト管理に未提出の変更があってもタブ移動は引き止めない（Android のタブは移っても画面が残り、編集内容も消えないため）。代わりにタブに点を出し、内容が消えるログアウトだけを確認する（`src/lib/unsavedChanges.tsx`）。
- Metro は `metro.config.js`（eslint は `eslint.config.js`）で `rakushifu-source` 条件を足し、core を src の TS から読む（dist 不要）。monorepo の他の設定は expo/metro-config が自動で行う。
- APK は EAS のローカルビルドで作る（`apps/android` で `npx eas-cli@latest build --local -p android --profile preview --output dist/rakushifu-preview.apk`）。クラウドのビルドは無料枠の順番待ちが長いため使っていない。Java 17 以上と Android SDK・NDK、`ANDROID_HOME` が要る。出力先の `dist/` は git に入れない。
- 署名鍵は EAS（プロジェクト `@uta_a/rakushifu-detail`）が保管し、ローカルビルドもそれを取ってきて使う。鍵が変わると既存のインストールを上書き更新できなくなるので、鍵を作り直さないこと。
- preview は実機向けの arm64-v8a だけを入れる（`eas.json` の `env` で `reactNativeArchitectures` を指定）。エミュレータで動かすときは開発サーバー（Expo Go）を使う。
- 配布用に出すときは `app.json` の `version` と `android.versionCode` を上げる（`appVersionSource: local`）。versionCode が同じか小さいと上書きインストールできない。

## 注意点

- らくしふの非公開APIに依存しているため、エンドポイントやcookie名（`xbit_at`）、レスポンス構造が変わると壊れる。`api/` や `packages/core/src/api/` を触るときはらくしふ側の仕様変更を疑う。
- 提出の CSRF トークンは提出ページの HTML をスクレイピングして取っている。マークアップが変わると壊れるので、取得できなかった場合は専用の文言（「提出トークンの取得に失敗しました」）で 502 を返し、他の失敗と切り分けられるようにしてある。
- `vercel.json` にCSP等のセキュリティヘッダーを設定済み。`connect-src 'self'` のため外部への直接fetchは不可（プロキシ前提の制約）。フロントで外部リソースを増やす場合はCSPも更新する。
