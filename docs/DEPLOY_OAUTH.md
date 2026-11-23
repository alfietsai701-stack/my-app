# 第三方登入設定說明（Google / LINE / Facebook / Apple）

後台支援四種第三方登入，加上原本的帳號密碼登入。

## 運作方式：帳號綁定

第三方登入**不用 email 對應**後台帳號（Apple 可能給轉寄信箱、FB / LINE 常常拿不到 email，沒驗證過的 email 也會被冒用）。改成：

1. 先用**帳號密碼**登入後台。
2. 點左下角（手機：「更多」）的 **「登入方式」**，按想用的平台旁邊的「綁定」。
3. 到該平台授權後回到後台，畫面顯示「已綁定」。
4. 之後在登入頁直接按那個平台的按鈕就能登入。

- 每個後台帳號、每個平台各綁一個第三方帳號；重新綁定會換成新的。
- 同一個第三方帳號不能同時綁在兩個後台帳號上。
- 刪除後台帳號時，它的綁定會一起刪除。
- 帳號密碼登入一直保留，綁定與否都能用。

還沒綁定就按第三方登入，會顯示：「這個第三方帳號還沒綁定後台帳號……」。

## 1. 資料庫遷移（新增 OAuthAccount 資料表）

先備份資料庫，再執行：

```bash
npx prisma db push
npx prisma generate
```

只是新增一張資料表，不會動到既有資料。

若偏好手動 SQL（例如在 Supabase SQL Editor 執行）：

```sql
CREATE TABLE "OAuthAccount" (
  "id"             TEXT NOT NULL,
  "provider"       TEXT NOT NULL,
  "providerUserId" TEXT NOT NULL,
  "adminUserId"    TEXT NOT NULL,
  "displayName"    TEXT,
  "email"          TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt"     TIMESTAMP(3),
  CONSTRAINT "OAuthAccount_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OAuthAccount_provider_providerUserId_key" ON "OAuthAccount"("provider", "providerUserId");
CREATE UNIQUE INDEX "OAuthAccount_adminUserId_provider_key" ON "OAuthAccount"("adminUserId", "provider");
ALTER TABLE "OAuthAccount" ADD CONSTRAINT "OAuthAccount_adminUserId_fkey"
  FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 跟 Customer / Appointment 等表一樣開啟 RLS，避免透過 Supabase 公開 API 讀到
ALTER TABLE "OAuthAccount" ENABLE ROW LEVEL SECURITY;
```

> 用 `prisma db push` 建表的話不會自動開 RLS，建完請另外執行最後那一行。

## 2. 共用環境變數

| 變數 | 用途 |
|---|---|
| `APP_URL` | 建議設定。對外網址，例如 `https://你的網域`（結尾不要加 `/`）。第三方平台的 callback 網址會用它組出來，避免 `*.vercel.app` 和自訂網域混用時對不上。 |

**按鈕顯示規則：**每個平台的環境變數設齊就會自動出現按鈕，缺任何一個就不顯示。舊的 `NEXT_PUBLIC_ENABLE_GOOGLE_LOGIN`、`NEXT_PUBLIC_ENABLE_LINE_LOGIN` 已經不用，可以從 Vercel 刪掉。

改完環境變數後，要在 Vercel 重新部署才會生效。

## 3. 各平台設定

Callback URL 的格式都是：`https://<你的網域>/api/auth/oauth/<平台>/callback`

### Google

1. [Google Cloud Console](https://console.cloud.google.com/) →「API 和服務」→「憑證」→ 建立 **OAuth 用戶端 ID**（類型：網頁應用程式）。
2. 「已授權的重新導向 URI」加入：`https://<你的網域>/api/auth/oauth/google/callback`
3. OAuth 同意畫面：發布狀態是「測試中」時，只有加進「測試使用者」的 Google 帳號能登入。只給三位管理員用的話，把三個人的 Google 帳號加進測試使用者就好。

| 變數 | 值 |
|---|---|
| `GOOGLE_CLIENT_ID` | 用戶端 ID |
| `GOOGLE_CLIENT_SECRET` | 用戶端密碼 |

### LINE

1. [LINE Developers](https://developers.line.biz/) → 在跟官方帳號（Messaging API）**同一個 Provider** 底下，新建一個 **LINE Login channel**。注意：這跟 Messaging API channel 不同，現有的 `LINE_CHANNEL_SECRET` 不能拿來用。
2. 「LINE Login」分頁 → Callback URL 填：`https://<你的網域>/api/auth/oauth/line/callback`
3. Channel 狀態是「Developing」時，只有 channel 的管理員／測試者能登入；要給其他人用就改成「Published」。
4. 不需要申請 email 權限：系統只用 LINE 的使用者 ID 和顯示名稱。

| 變數 | 值 |
|---|---|
| `LINE_LOGIN_CHANNEL_ID` | Channel ID |
| `LINE_LOGIN_CHANNEL_SECRET` | Channel secret |

### Facebook

1. [Meta for Developers](https://developers.facebook.com/apps/) → 建立應用程式，使用案例選「透過 Facebook 登入驗證並向用戶索取資料」。
2. 「Facebook 登入」→ 設定 →「有效的 OAuth 重新導向 URI」加入：`https://<你的網域>/api/auth/oauth/facebook/callback`
3. 「應用程式設定 → 基本資料」：
   - 隱私政策網址：`https://<你的網域>/privacy`
   - 用戶資料刪除：選「資料刪除指示網址」，填 `https://<你的網域>/privacy#data-deletion`
4. 應用程式在「開發模式」時，只有在「應用程式角色」裡的人能登入。只給三位管理員用的話，把三個人加成測試人員就好，不用送審；要切換成「上線模式」則需要填隱私權政策網址等資料。
5. 系統只要 `public_profile` 權限（使用者 ID 和名稱），不要 email。

| 變數 | 值 |
|---|---|
| `FACEBOOK_APP_ID` | 應用程式編號 |
| `FACEBOOK_APP_SECRET` | 應用程式密鑰 |
| `FACEBOOK_GRAPH_VERSION` | 選填，預設 `v26.0` |

### Apple（需要 Apple Developer Program，每年 US$99）

1. [Apple Developer](https://developer.apple.com/account/resources/identifiers/list) → Identifiers：
   - 建立（或沿用）一個 **App ID**，勾選「Sign In with Apple」。
   - 建立一個 **Services ID**（例如 `com.adastudio.web`），勾選「Sign In with Apple」→ Configure：
     - Primary App ID：選上面的 App ID
     - Domains：`<你的網域>`（不含 https://）
     - Return URLs：`https://<你的網域>/api/auth/oauth/apple/callback`
2. Keys → 建立 Key，勾選「Sign In with Apple」，下載 `.p8` 檔（只能下載一次），記下 Key ID。
3. Team ID 在帳號右上角／Membership 頁。
4. Apple 不接受 `localhost`，只能在正式網域上測。

| 變數 | 值 |
|---|---|
| `APPLE_SERVICES_ID` | Services ID（例如 `com.adastudio.web`） |
| `APPLE_TEAM_ID` | Team ID |
| `APPLE_KEY_ID` | Key ID |
| `APPLE_PRIVATE_KEY` | `.p8` 檔的完整內容（含 `-----BEGIN PRIVATE KEY-----` 那兩行）。Vercel 可以直接貼多行；若只能貼一行，換行改成 `\n`。 |

Apple 登入不要求姓名和 email，所以使用者不會看到「分享／隱藏電子郵件」的選項，系統只記 Apple 的使用者 ID。

## 4. 上線後測試

1. 用帳號密碼登入 →「登入方式」→ 綁定一個平台，回到後台應顯示「已綁定」。
2. 登出 → 在登入頁按同一個平台 → 應直接進入後台。
3. 用沒綁定的第三方帳號登入 → 應顯示「還沒綁定後台帳號」。
4. 在第三方授權頁按取消 → 應顯示「已取消第三方登入」。
5. 「登入方式」→ 解除綁定 → 再用該平台登入應顯示「還沒綁定」。
6. 用另一個後台帳號綁定同一個第三方帳號 → 應顯示「已經綁定在其他後台帳號上」。

登入失敗的詳細原因會記在 Vercel 的 Runtime Logs，搜尋 `[oauth]`。
