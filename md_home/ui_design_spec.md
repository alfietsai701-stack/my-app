# Ada 慢療室 — UI Design Spec

> 本文件定義系統的視覺語言，vibe coding 時 AI 必須依照此規範生成樣式，不得自行發揮。

---

## 1. 設計原則

| 原則 | 說明 |
|------|------|
| 溫柔療癒 | 柔和的大地色系，避免強對比與飽和色 |
| 留白呼吸 | 充足的間距，讓頁面不擁擠 |
| 一致性 | 所有元件遵循同一套規範，不因頁面不同而改變 |
| 簡單直覺 | 操作流程清楚，減少不必要的裝飾 |

---

## 2. 色彩系統

### 2.1 主色盤（Brand Colors）

| 名稱 | Token | Hex | 用途 |
|------|-------|-----|------|
| Cream | `--color-cream` | `#F5F0E8` | 頁面底色、Sidebar 背景 |
| Latte | `--color-latte` | `#C9A87C` | 主要強調色、按鈕、連結 |
| Walnut | `--color-walnut` | `#8B6347` | Hover 狀態、深色按鈕 |
| Mist | `--color-mist` | `#EDE8E0` | Card 背景、Input 背景 |
| Fog | `--color-fog` | `#D6CFC4` | 邊框、分隔線 |

### 2.2 中性色（Neutrals）

| 名稱 | Token | Hex | 用途 |
|------|-------|-----|------|
| Ink | `--color-ink` | `#2C2420` | 主要文字 |
| Stone | `--color-stone` | `#6B5E54` | 次要文字、說明文字 |
| Pebble | `--color-pebble` | `#A89990` | Placeholder、禁用文字 |
| White | `--color-white` | `#FDFCFA` | 卡片底色、Modal 底色 |

### 2.3 語意色（Semantic Colors）

| 名稱 | Token | Hex | 用途 |
|------|-------|-----|------|
| Success | `--color-success` | `#7A9E7E` | 完成狀態、成功提示 |
| Warning | `--color-warning` | `#C9974A` | 低庫存警示、待確認 |
| Danger | `--color-danger` | `#B56B6B` | 刪除、取消、錯誤 |
| Info | `--color-info` | `#7A96AE` | 資訊提示 |

### 2.4 shadcn CSS Variables 對應

在 `app/globals.css` 的 `:root` 區塊設定：

```css
:root {
  --background: 40 33% 95%;          /* Cream #F5F0E8 */
  --foreground: 15 15% 15%;          /* Ink #2C2420 */
  --card: 0 0% 99%;                  /* White #FDFCFA */
  --card-foreground: 15 15% 15%;
  --primary: 30 40% 64%;             /* Latte #C9A87C */
  --primary-foreground: 0 0% 99%;
  --secondary: 35 20% 88%;           /* Mist #EDE8E0 */
  --secondary-foreground: 15 15% 15%;
  --muted: 35 15% 83%;               /* Fog #D6CFC4 */
  --muted-foreground: 20 12% 44%;    /* Stone #6B5E54 */
  --accent: 30 40% 64%;
  --accent-foreground: 0 0% 99%;
  --destructive: 0 33% 56%;          /* Danger #B56B6B */
  --border: 35 15% 83%;              /* Fog #D6CFC4 */
  --input: 35 20% 88%;               /* Mist #EDE8E0 */
  --ring: 30 40% 64%;                /* Latte */
  --radius: 0.75rem;
}
```

---

## 3. 字型規範

### 3.1 字型家族

```css
/* 中文：思源宋體（優雅感）搭配 Noto Sans TC */
font-family: 'Noto Sans TC', 'PingFang TC', sans-serif;
```

在 `app/layout.tsx` 使用 Next.js Font：

```ts
import { Noto_Sans_TC } from 'next/font/google'

const notoSansTC = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
})
```

### 3.2 字型比例

| 層級 | Class | Size | Weight | 用途 |
|------|-------|------|--------|------|
| Display | `text-2xl` | 24px | 500 | 頁面大標題 |
| Heading | `text-xl` | 20px | 500 | 區塊標題 |
| Subheading | `text-base` | 16px | 500 | 卡片標題、表格欄位名 |
| Body | `text-sm` | 14px | 400 | 主要內文 |
| Caption | `text-xs` | 12px | 400 | 說明文字、標籤 |

### 3.3 行高與字距

```css
line-height: 1.7;        /* 內文 */
line-height: 1.4;        /* 標題 */
letter-spacing: 0.02em;  /* 中文間距 */
```

---

## 4. 間距系統

使用 Tailwind 預設 spacing scale，統一規範如下：

| 用途 | Token | px |
|------|-------|----|
| 元件內間距（小） | `p-2` | 8px |
| 元件內間距（中） | `p-4` | 16px |
| 元件內間距（大） | `p-6` | 24px |
| 元件間距 | `gap-4` | 16px |
| 區塊間距 | `gap-6` | 24px |
| 頁面內距 | `p-6` | 24px |

---

## 5. 元件規範

### 5.1 按鈕（Button）

#### Primary Button
```tsx
<Button className="bg-[#C9A87C] hover:bg-[#8B6347] text-white rounded-xl px-5 py-2.5 text-sm font-medium transition-colors">
  新增顧客
</Button>
```
- 背景：Latte `#C9A87C`
- Hover：Walnut `#8B6347`
- 文字：White
- 圓角：`rounded-xl`（12px）

#### Secondary Button
```tsx
<Button variant="outline" className="border-[#D6CFC4] text-[#6B5E54] hover:bg-[#EDE8E0] rounded-xl">
  取消
</Button>
```
- 邊框：Fog `#D6CFC4`
- 文字：Stone `#6B5E54`
- Hover 背景：Mist `#EDE8E0`

#### Danger Button

```tsx
<Button variant="destructive" className="bg-[#B56B6B] hover:bg-[#9A5555] rounded-xl">
  刪除
</Button>
```

#### 按鈕尺寸規範

| 尺寸 | Class | 用途 |
|------|-------|------|
| 大 | `h-11 px-6 text-base` | 頁面主要動作 |
| 中（預設） | `h-9 px-5 text-sm` | 一般操作 |
| 小 | `h-7 px-3 text-xs` | 表格內操作 |

---

### 5.2 表單（Form）

#### Input

```tsx
<Input className="bg-[#EDE8E0] border-[#D6CFC4] focus:border-[#C9A87C] focus:ring-[#C9A87C] rounded-xl placeholder:text-[#A89990]" />
```
- 背景：Mist `#EDE8E0`
- 邊框：Fog `#D6CFC4`
- Focus 邊框：Latte `#C9A87C`
- Placeholder：Pebble `#A89990`
- 圓角：`rounded-xl`

#### Select

- 樣式同 Input
- 使用 shadcn `Select` 元件

#### Textarea

- 樣式同 Input
- 最小高度：`min-h-[100px]`

#### 表單間距

- 欄位間距：`space-y-4`
- Label 與 Input 間距：`mb-1.5`
- Label 樣式：`text-sm font-medium text-[#2C2420]`

#### 錯誤訊息

```tsx
<p className="text-xs text-[#B56B6B] mt-1">此欄位為必填</p>
```

---

### 5.3 表格（Table）

```tsx
// 使用 shadcn DataTable + TanStack Table
// 表格容器
<div className="rounded-xl border border-[#D6CFC4] overflow-hidden bg-[#FDFCFA]">
  <Table>
    <TableHeader className="bg-[#EDE8E0]">
      <TableRow className="border-[#D6CFC4]">
        <TableHead className="text-[#6B5E54] font-medium text-sm">姓名</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow className="border-[#D6CFC4] hover:bg-[#F5F0E8]">
        <TableCell className="text-[#2C2420] text-sm">王小明</TableCell>
      </TableRow>
    </TableBody>
  </Table>
</div>
```

- 表頭背景：Mist `#EDE8E0`
- 表頭文字：Stone `#6B5E54`
- Row Hover：Cream `#F5F0E8`
- 邊框：Fog `#D6CFC4`
- 圓角容器：`rounded-xl`

---

### 5.4 卡片（Card）

```tsx
<Card className="bg-[#FDFCFA] border-[#D6CFC4] rounded-2xl shadow-none">
  <CardHeader className="pb-3">
    <CardTitle className="text-base font-medium text-[#2C2420]">本月收入</CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-2xl font-medium text-[#C9A87C]">NT$ 28,500</p>
  </CardContent>
</Card>
```

- 背景：White `#FDFCFA`
- 邊框：Fog `#D6CFC4`
- 圓角：`rounded-2xl`（16px）
- 無陰影：`shadow-none`

---

### 5.5 Badge / 狀態標籤

| 狀態 | 樣式 |
|------|------|
| 已確認 confirmed | `bg-[#EDE8E0] text-[#6B5E54]` |
| 已完成 completed | `bg-[#D4E6D5] text-[#4A7A4E]` |
| 已取消 cancelled | `bg-[#F0DADA] text-[#8B4444]` |
| 低庫存警示 | `bg-[#F5E6D0] text-[#8B5E2A]` |

```tsx
<Badge className="bg-[#D4E6D5] text-[#4A7A4E] rounded-full px-3 py-0.5 text-xs font-medium">
  已完成
</Badge>
```

---

### 5.6 Modal / Dialog

```tsx
<Dialog>
  <DialogContent className="bg-[#FDFCFA] border-[#D6CFC4] rounded-2xl max-w-md">
    <DialogHeader>
      <DialogTitle className="text-base font-medium text-[#2C2420]">新增顧客</DialogTitle>
    </DialogHeader>
    {/* 表單內容 */}
    <DialogFooter className="gap-2">
      <Button variant="outline">取消</Button>
      <Button>儲存</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## 6. 頁面版型規範

### 6.1 整體版型

```
┌─────────────────────────────────────────┐
│  Sidebar (240px 固定)  │  Content Area  │
│                        │                │
│  Logo                  │  Header        │
│  ─────────────         │  ──────────── │
│  導覽選單              │  頁面內容      │
│                        │                │
│                        │                │
└─────────────────────────────────────────┘
```

- Sidebar 寬度：`w-60`（240px），固定不收合
- Content Area：`flex-1`，內距 `p-6`
- 整體背景：Cream `#F5F0E8`

### 6.2 Sidebar

```tsx
// 背景：White #FDFCFA，右側邊框：Fog #D6CFC4
<aside className="w-60 h-screen bg-[#FDFCFA] border-r border-[#D6CFC4] flex flex-col">
  {/* Logo 區 */}
  <div className="p-6 border-b border-[#D6CFC4]">
    <h1 className="text-base font-medium text-[#2C2420]">Ada 慢療室</h1>
    <p className="text-xs text-[#A89990] mt-0.5">管理後台</p>
  </div>
  {/* 導覽選單 */}
  <nav className="flex-1 p-4 space-y-1">
    {/* 選單項目 */}
  </nav>
</aside>
```

#### 選單項目樣式

```tsx
// 一般狀態
<Link className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#6B5E54] hover:bg-[#F5F0E8] hover:text-[#2C2420] transition-colors">

// 選中狀態
<Link className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm bg-[#EDE8E0] text-[#2C2420] font-medium">
```

#### Sidebar 選單項目

| 圖示 | 名稱 | 路徑 |
|------|------|------|
| Home | 首頁 | `/` |
| Users | 顧客 | `/customers` |
| Calendar | 預約 | `/appointments` |
| Scissors | 服務 | `/services` |
| Package | 庫存 | `/inventory` |
| BarChart | 報表 | `/reports` |
| Star | 會員 | `/members` |

圖示使用 `lucide-react`。

---

### 6.3 Header

```tsx
<header className="h-14 border-b border-[#D6CFC4] bg-[#FDFCFA] flex items-center justify-between px-6">
  {/* 左：頁面標題 */}
  <h2 className="text-base font-medium text-[#2C2420]">顧客管理</h2>
  {/* 右：操作按鈕區 */}
  <div className="flex items-center gap-3">
    <Button>新增顧客</Button>
  </div>
</header>
```

---

### 6.4 頁面內容區結構

```tsx
<main className="flex-1 bg-[#F5F0E8] p-6 overflow-auto">
  {/* 統計卡片區（如有） */}
  <div className="grid grid-cols-3 gap-4 mb-6">
    <Card />
    <Card />
    <Card />
  </div>

  {/* 主要內容卡片 */}
  <Card className="bg-[#FDFCFA] border-[#D6CFC4] rounded-2xl">
    <CardContent className="p-0">
      <DataTable />
    </CardContent>
  </Card>
</main>
```

---

### 6.5 響應式規範

筆記型電腦為主要裝置，斷點設定：

| 斷點 | 寬度 | 行為 |
|------|------|------|
| `lg` | 1024px+ | 標準版面（Sidebar + Content） |
| `md` | 768px~1023px | Sidebar 收合為 icon only |
| `sm` | 以下 | 暫不支援（內部系統） |

---

## 7. 動態效果

- Transition：`transition-colors duration-150` 用於顏色變化
- Hover：輕微背景色變化，無縮放效果
- 不使用複雜動畫，保持簡潔
- Dialog / Modal 開關使用 shadcn 預設動畫

---

## 8. 圖示規範

- 使用 `lucide-react`（已隨 shadcn 安裝）
- 尺寸：`size={16}` 用於行內、`size={20}` 用於獨立圖示
- 顏色：繼承父層文字色，不單獨設定
- 不使用 emoji 作為功能性圖示

---

## 9. AI 生成樣式規則

1. 所有顏色使用本文件定義的 Hex 值，**不使用** Tailwind 預設色（如 `blue-500`）
2. 圓角統一使用 `rounded-xl`（元件）或 `rounded-2xl`（卡片），**不使用** `rounded` 或 `rounded-lg`
3. **不加** `shadow`，所有卡片 `shadow-none`
4. 間距遵循第 4 節規範，**不自訂** 任意 padding / margin 數值
5. 字型大小只使用 `text-xs`、`text-sm`、`text-base`、`text-xl`、`text-2xl`
6. **不使用** 漸層（gradient）背景
