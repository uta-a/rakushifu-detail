# skylark-salary-detail

すかいらーくグループの「らくしふ」シフト管理サイトから確定シフトデータを取得し、予定通り働いた場合の給料を自動計算するWebアプリ。

## 機能

- らくしふへの自動ログイン・シフトデータ取得
- 月間シフト一覧表示（日付、時間、通常/深夜時間の内訳）
- 給料自動計算（通常給、深夜割増 x1.25、交通費）
- 時給・交通費の設定（ブラウザに保存）
- 月切り替え表示

## 技術スタック

- React + TypeScript + Vite
- Tailwind CSS
- Vercel Serverless Functions（認証プロキシ・APIプロキシ）
- Vitest（テスト）

## セットアップ

```bash
git clone https://github.com/uta-a/skylark-salary-detail.git
cd skylark-salary-detail
npm install
npm run dev
```

## デプロイ

Vercelにデプロイして使用する。

```bash
npx vercel
```

## テスト

```bash
npm test
```
