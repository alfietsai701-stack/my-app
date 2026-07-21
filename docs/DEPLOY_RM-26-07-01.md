# 部署與設定說明（RM-26-07-01，v1.0.0 → v1.1.0）

本次維護涉及一個資料庫欄位新增與數個新環境變數。請依序完成。

## 1. 資料庫遷移（新增 Customer.tags 欄位）

專案採用 `prisma db push`。部署前務必先備份資料庫，再執行：

```bash
# 先備份！
npx prisma db push        # 依 schema 新增 Customer.tags String[] 欄位
npx prisma generate
```

> 若偏好手動 SQL：`ALTER TABLE "Customer" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT '{}';`

## 2. 新增環境變數

| 變數 | 用途 | 必填 |
|---|---|---|
| `CRON_SECRET` | 前一日提醒 Cron 的授權金鑰（Vercel Cron 會自動帶入相同值） | 提醒功能必填 |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google 第三方登入 | 啟用才需 |
| `NEXT_PUBLIC_ENABLE_GOOGLE_LOGIN` | 設 `1` 顯示「使用 Google 登入」按鈕 | 啟用才需 |
| `LINE_LOGIN_CHANNEL_ID` / `LINE_LOGIN_CHANNEL_SECRET` | LINE Login（注意：與 Messaging API channel 不同，需在 LINE Developers 另建 LINE Login channel） | 啟用才需 |
| `NEXT_PUBLIC_ENABLE_LINE_LOGIN` | 設 `1` 顯示「使用 LINE 登入」按鈕 | 啟用才需 |

第三方登入的 **Callback URL** 需在各平台設定為：
- Google：`https://<你的網域>/api/auth/oauth/google/callback`
- LINE：`https://<你的網域>/api/auth/oauth/line/callback`

> 第三方登入以 **email 對應既有管理員帳號**，不會自動建立帳號。請確保管理員的 Google/LINE email 與後台帳號 email 一致。

## 3. 前一日提醒 Cron

`vercel.json` 已設定每日 `0 2 * * *`（UTC）＝台灣時間每天 10:00 觸發 `/api/cron/reminders`，
自動對「明天有預約且已綁定 LINE」的顧客推播提醒。部署到 Vercel 後即生效，並請設定 `CRON_SECRET`。

## 4. 公休設定

新版公休改為後台可調。部署後至「系統設定 → 營業與公休設定」即可：
- 勾選每週固定公休（預設維持週日）
- 新增臨時公休日、特殊營業日（覆蓋固定公休）
