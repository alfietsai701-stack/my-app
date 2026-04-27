# Ada 慢療室 — 管理系統規格文件

> 本文件為 vibe coding 的唯一參考依據。AI 生成程式碼時，**不得超出本文件定義的範圍**。

---

## 1. 專案概述

| 項目 | 內容 |
|------|------|
| 專案名稱 | Ada 慢療室管理系統 |
| 使用對象 | 工作室內部人員（非公開） |
| 裝置 | 桌機 / 平板為主 |
| 語言 | 繁體中文 UI |

---

## 2. 技術規格

| 層級 | 技術 |
|------|------|
| 前端框架 | Next.js 16 (App Router) + TypeScript |
| 樣式 | Tailwind CSS + shadcn/ui (Nova preset) |
| 後端 | Next.js API Route (Route Handler) |
| ORM | Prisma 5 |
| 資料庫 | PostgreSQL (Supabase) |
| 部署 | Vercel |
| 通知 | LINE Notify API |

### 2.1 環境變數（`.env`）

```
DATABASE_URL=      # Supabase pooler 連線字串
DIRECT_URL=        # Supabase direct 連線字串（postgres user）
NEXTAUTH_SECRET=   # NextAuth 密鑰
NEXTAUTH_URL=      # 本機 http://localhost:3000
LINE_NOTIFY_TOKEN= # LINE Notify token
```

---

## 3. 資料夾結構

```
my-app/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx          # Sidebar + Header
│   │   ├── page.tsx            # 首頁 Dashboard
│   │   ├── customers/
│   │   │   ├── page.tsx        # 顧客列表
│   │   │   ├── new/page.tsx    # 新增顧客
│   │   │   └── [id]/page.tsx   # 顧客詳細
│   │   ├── appointments/
│   │   │   ├── page.tsx        # 預約列表 / 行事曆
│   │   │   └── new/page.tsx    # 新增預約
│   │   ├── services/
│   │   │   └── page.tsx        # 服務項目管理
│   │   ├── inventory/
│   │   │   └── page.tsx        # 庫存管理
│   │   ├── reports/
│   │   │   └── page.tsx        # 財務報表
│   │   └── members/
│   │       └── page.tsx        # 會員管理
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── customers/route.ts
│       ├── customers/[id]/route.ts
│       ├── appointments/route.ts
│       ├── appointments/[id]/route.ts
│       ├── services/route.ts
│       ├── inventory/route.ts
│       ├── receipts/route.ts
│       └── notify/route.ts
├── components/
│   ├── ui/                     # shadcn 元件（不手動修改）
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   └── shared/
│       ├── DataTable.tsx
│       └── Modal.tsx
├── lib/
│   ├── prisma.ts               # Prisma client 單例
│   ├── auth.ts                 # NextAuth 設定
│   └── line.ts                 # LINE Notify 工具函式
└── prisma/
    └── schema.prisma
```

---

## 4. 資料庫 ERD

### 4.1 資料表關聯

```
Customer (顧客)
  ├── 1:N → Appointment (預約)
  └── 1:1 → Member (會員)

Service (服務項目)
  └── 1:N → Appointment (預約)

Appointment (預約)
  └── 1:1 → Receipt (收據)

InventoryItem (庫存) — 獨立資料表，無外鍵關聯
```

### 4.2 資料表定義

#### Customer（顧客）
| 欄位 | 型別 | 說明 |
|------|------|------|
| id | text PK | cuid() |
| name | text | 姓名，必填 |
| phone | text UNIQUE | 電話，必填 |
| birthday | timestamptz? | 生日，選填 |
| note | text? | 備註，選填 |
| createdAt | timestamptz | 建立時間，自動 |

#### Service（服務項目）
| 欄位 | 型別 | 說明 |
|------|------|------|
| id | text PK | cuid() |
| name | text | 服務名稱 |
| price | int | 價格（元） |
| durationMin | int | 時長（分鐘） |
| category | text | 分類（e.g. 臉部、身體） |

#### Appointment（預約）
| 欄位 | 型別 | 說明 |
|------|------|------|
| id | text PK | cuid() |
| customerId | text FK | 顧客 |
| serviceId | text FK | 服務項目 |
| scheduledAt | timestamptz | 預約時間 |
| status | text | confirmed / cancelled / completed |
| note | text? | 備註 |
| createdAt | timestamptz | 建立時間，自動 |

#### Receipt（收據）
| 欄位 | 型別 | 說明 |
|------|------|------|
| id | text PK | cuid() |
| appointmentId | text FK UNIQUE | 對應預約 |
| total | int | 總金額（元） |
| payMethod | text | cash / transfer / card |
| paidAt | timestamptz | 付款時間，自動 |

#### InventoryItem（庫存）
| 欄位 | 型別 | 說明 |
|------|------|------|
| id | text PK | cuid() |
| name | text | 品項名稱 |
| quantity | int | 現有數量 |
| alertLevel | int | 低庫存警示門檻 |
| unit | text | 單位（e.g. 瓶、ml） |

#### Member（會員）
| 欄位 | 型別 | 說明 |
|------|------|------|
| id | text PK | cuid() |
| customerId | text FK UNIQUE | 對應顧客 |
| tier | text | general / vip |
| points | int | 累積點數，預設 0 |
| joinedAt | timestamptz | 加入時間，自動 |

---

## 5. 功能模組規格

### M1 — 顧客管理

**頁面：** `/customers`
- 顧客列表，含搜尋（姓名 / 電話）、分頁（每頁 20 筆）
- 點擊顧客進入詳細頁，顯示基本資料 + 歷史預約紀錄
- 新增 / 編輯顧客表單（姓名、電話、生日、備註）
- 刪除顧客（軟刪除，加 deletedAt 欄位）

**API：**
- `GET /api/customers` — 列表（支援 `?search=` 查詢）
- `POST /api/customers` — 新增
- `GET /api/customers/[id]` — 單筆
- `PATCH /api/customers/[id]` — 編輯
- `DELETE /api/customers/[id]` — 刪除

---

### M2 — 預約排程

**頁面：** `/appointments`
- 預設顯示本週行事曆視圖
- 可切換為列表視圖
- 新增預約：選顧客、選服務、選時間、填備註
- 預約狀態可修改（confirmed / completed / cancelled）
- 完成預約時自動跳出結帳視窗

**API：**
- `GET /api/appointments` — 列表（支援 `?date=` 篩選）
- `POST /api/appointments` — 新增（新增後觸發 LINE 通知）
- `PATCH /api/appointments/[id]` — 更新狀態

---

### M3 — 服務與收費

**頁面：** `/services`
- 服務項目列表（依分類分組顯示）
- 新增 / 編輯 / 刪除服務項目
- 結帳在預約完成時進行，產生 Receipt

**API：**
- `GET /api/services` — 列表
- `POST /api/services` — 新增
- `PATCH /api/services/[id]` — 編輯
- `DELETE /api/services/[id]` — 刪除
- `POST /api/receipts` — 建立收據

---

### M4 — 庫存管理

**頁面：** `/inventory`
- 庫存列表，低庫存品項標紅色警示
- 新增 / 編輯品項
- 手動調整數量（增加 / 減少）

**API：**
- `GET /api/inventory` — 列表
- `POST /api/inventory` — 新增
- `PATCH /api/inventory/[id]` — 編輯數量

---

### M5 — 財務報表

**頁面：** `/reports`
- 本月總收入、本週總收入（數字卡片）
- 收入折線圖（依日期）
- 各服務項目營收佔比（圓餅圖）
- 可切換月份查看歷史資料

**API：**
- `GET /api/reports?month=YYYY-MM` — 回傳該月份統計資料

---

### M6 — 會員管理

**頁面：** `/members`
- 會員列表（顯示等級、點數、最近到訪）
- 升級 / 降級會員等級
- 手動調整點數

**API：**
- `GET /api/members` — 列表
- `PATCH /api/members/[id]` — 更新等級 / 點數

---

### M7 — LINE 通知

**觸發時機：**
- 新增預約時 → 通知工作室（預約人、服務、時間）
- 預約前一天 18:00 → 提醒顧客（需搭配 cron job）

**工具函式：** `lib/line.ts`
```ts
export async function sendLineNotify(message: string): Promise<void>
```

---

## 6. UI 規範

- 使用 shadcn/ui 現有元件，**不自訂元件樣式**
- 版面：左側 Sidebar（固定） + 右側內容區
- Sidebar 選單項目：首頁、顧客、預約、服務、庫存、報表、會員
- 色系：跟隨 shadcn Nova preset（不額外定義主色）
- 表格一律使用 shadcn DataTable + TanStack Table
- 表單一律使用 shadcn Form + react-hook-form + zod 驗證

---

## 7. 開發限制（AI 必須遵守）

1. **不使用** `any` 型別，所有型別需明確定義
2. **不自行新增** 資料表或欄位，需先更新本文件
3. **不安裝** 未在本文件列出的套件，需先確認
4. API Route 一律加上錯誤處理（try/catch + 適當 HTTP status）
5. 敏感資訊一律從 `process.env` 讀取，不寫死在程式碼裡
6. 每個功能模組完成後需可獨立運作，不依賴未完成的模組