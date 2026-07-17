# Firebase セットアップ手順（初回のみ）

このアプリは Firebase Authentication（Googleログイン）と Firestore を使います。
以下は**Firebaseコンソール側で一度だけ**行う設定です。

> ⚠️ このファイルには実際のメールアドレスは記載していません。
> 許可アカウントのメールは、下記「3. 許可アカウントの初期登録」で
> **Firebaseコンソールに直接入力**します（公開リポジトリには残りません）。

---

## 1. Firestore データベースの有効化

1. [Firebaseコンソール](https://console.firebase.google.com/) → プロジェクト `gen-lang-client-0874086404` を開く
2. 左メニュー **Firestore Database** → **データベースを作成**
3. ロケーションは `asia-northeast1`（東京）などを選択
4. モードは「本番環境モード」で作成（ルールは次項で設定）

## 2. セキュリティルールの適用

1. Firestore Database → **ルール** タブ
2. リポジトリ内の [`firestore.rules`](../firestore.rules) の内容を全てコピーして貼り付け
3. **公開** をクリック

## 3. 許可アカウントの初期登録（config/access ドキュメント）

1. Firestore Database → **データ** タブ
2. **コレクションを開始** → コレクションID: `config`
3. ドキュメントID: `access`（自動IDにしない。必ず `access` と入力）
4. 次のフィールドを追加：

   | フィールド | 型 | 値 |
   |---|---|---|
   | `members` | array（string） | 利用を許可する全員のメールアドレス（開発者含む・小文字） |
   | `developerEmail` | string | 開発者タブを操作できるメールアドレス（小文字） |

   - `members` には「職員のGoogleアカウント」＋「開発者のGoogleアカウント」を全て入れる
   - `developerEmail` は `members` にも含まれている必要がある
5. 保存

> 登録後は、アプリの **開発者タブ → 許可アカウント管理** から
> メンバーの追加・削除や開発者メールの変更が画面上で行えます。

## 4. Googleログインの有効化・ドメイン許可

1. Authentication → **Sign-in method** → **Google** を有効化
2. Authentication → **Settings** → **承認済みドメイン (Authorized domains)** に
   公開ドメイン `salubre4399.github.io` を追加
3. （必要に応じて）Google Cloud コンソールの OAuth クライアント設定で、
   承認済みJavaScript生成元／リダイレクトURIに公開URLを追加

---

## データ構成（参考）

| コレクション / ドキュメント | 用途 |
|---|---|
| `config/access` | 許可アカウント・開発者メール |
| `workers/{id}` | 内職担当者 |
| `jobs/{id}` | 作業マスタ |
| `workLogs/{id}` | 作業・進捗記録 |
| `payments/{id}` | 月次支払い |
| `settings/app`, `meta/bulletin` | 共有設定・お知らせ（将来利用） |

以前ブラウザ内(LocalStorage)に入力していたデータがある場合は、
アプリの **開発者タブ → 端末内データのクラウド移行** から一度だけ取り込めます。
