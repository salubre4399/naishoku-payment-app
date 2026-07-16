# 内職報酬計算・管理システム

内職の担当者・月ごとの支払い管理、明細書の自動発行、支払状況の可視化、CSVエクスポートを行うWebアプリです。

- **技術構成**: React 19 + Vite + TypeScript + Tailwind CSS
- **認証**: Firebase Authentication（Googleログイン）
- **データ連携**: Google Drive API

## ローカルでの起動

```bash
npm install
npm run dev
```

ブラウザで表示される `http://localhost:3000` を開きます。

## ビルド

```bash
npm run build     # dist/ に本番用ファイルを生成
npm run preview   # ビルド結果をローカルで確認
```

## デプロイ（GitHub Pages）

`main` ブランチに push すると、GitHub Actions（`.github/workflows/deploy.yml`）が
自動でビルドして GitHub Pages に公開します。

公開URL: `https://<GitHubユーザー名>.github.io/naishoku-payment-app/`

### 初回のみ必要な設定

1. **GitHub リポジトリの Settings → Pages** で、Source を **GitHub Actions** に設定する。
2. **Firebase コンソール**（Authentication → Settings → Authorized domains）に
   公開ドメイン `<GitHubユーザー名>.github.io` を追加する。
   これを行わないとGoogleログインのポップアップがブロックされます。
3. **Google Cloud コンソール**の OAuth クライアント設定で、承認済みの
   JavaScript 生成元／リダイレクトURIに公開URLを追加する。

> リポジトリ名を `naishoku-payment-app` 以外に変更する場合は、
> `vite.config.ts` の `base` も同じ名前に合わせて変更してください。

## 注意

- `firebase-applet-config.json` に含まれるキーはFirebaseのクライアント用公開識別子で、
  秘密情報ではありません（アクセス制御はFirebaseのルールとOAuth設定で行います）。
- このアプリはGeminiを使用していません（サーバー不要の静的サイトです）。
