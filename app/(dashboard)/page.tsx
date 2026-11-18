import { prisma } from '@/lib/prisma'
import { getBusinessHours, isClosedOn } from '@/lib/business-hours'
import DashboardView, { type DashboardData } from './DashboardView'

// 店在台灣，所有「今天／本週／本月」都以台北時間（UTC+8）為準，
// 不依賴伺服器所在時區。
const TZ_MS = 8 * 60 * 60 * 1000
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

/** 把真實時間轉成台北的「牆上時鐘」，之後用 getUTC* 讀年月日時分 */
function wall(d: Date) { return new Date(d.getTime() + TZ_MS) }
/** 台北時間某年月日 00:00 對應的真實時間（month 可超出 0–11，會自動進位） */
function tpe(y: number, m: number, d: number) { return new Date(Date.UTC(y, m, d) - TZ_MS) }
const pad = (n: number) => String(n).padStart(2, '0')

type TodayRow = {
  id: string
  scheduledAt: Date
  status: string
  customer: { name: string }
  service: { name: string; durationMin: number }
}
type ReceiptRow = { total: number; appointment: { service: { category: string } } }
type StockRow = { id: string; name: string; category: string; quantity: number; alertLevel: number; unit: string }

export default async function DashboardPage() {
  const now = new Date()
  const w = wall(now)
  const [y, mo, day, dow] = [w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate(), w.getUTCDay()]

  const todayStart     = tpe(y, mo, day)
  const tomorrowStart  = tpe(y, mo, day + 1)
  const thisMonthStart = tpe(y, mo, 1)
  const nextMonthStart = tpe(y, mo + 1, 1)
  const lastMonthStart = tpe(y, mo - 1, 1)
  const mondayOffset   = (dow + 6) % 7 // 週一為一週的開始
  const weekStart      = tpe(y, mo, day - mondayOffset)
  const weekEnd        = tpe(y, mo, day - mondayOffset + 7)

  const [
    receiptsThis, receiptsLast, apptCountThis,
    monthAppts, todayAppts, weekAppts, inventoryItems, hours,
  ] = await Promise.all([
    prisma.receipt.findMany({
      where: { paidAt: { gte: thisMonthStart, lt: nextMonthStart } },
      select: { total: true, appointment: { select: { service: { select: { category: true } } } } },
    }),
    prisma.receipt.aggregate({ where: { paidAt: { gte: lastMonthStart, lt: thisMonthStart } }, _sum: { total: true } }),
    prisma.appointment.count({ where: { scheduledAt: { gte: thisMonthStart, lt: nextMonthStart }, status: { not: 'cancelled' } } }),
    prisma.appointment.findMany({
      where: { scheduledAt: { gte: thisMonthStart, lt: nextMonthStart }, status: { not: 'cancelled' } },
      select: { service: { select: { name: true } } },
    }),
    prisma.appointment.findMany({
      where: { scheduledAt: { gte: todayStart, lt: tomorrowStart } },
      orderBy: { scheduledAt: 'asc' },
      select: {
        id: true, scheduledAt: true, status: true,
        customer: { select: { name: true } },
        service:  { select: { name: true, durationMin: true } },
      },
    }),
    prisma.appointment.findMany({
      where: { scheduledAt: { gte: weekStart, lt: weekEnd }, status: { not: 'cancelled' } },
      select: { scheduledAt: true },
    }),
    prisma.inventoryItem.findMany({
      select: { id: true, name: true, category: true, quantity: true, alertLevel: true, unit: true },
      orderBy: { quantity: 'asc' },
    }),
    getBusinessHours(),
  ])

  // 本月營收與各分類占比
  const revenueThis = (receiptsThis as ReceiptRow[]).reduce((sum: number, r: ReceiptRow) => sum + r.total, 0)
  const byCategory = new Map<string, number>()
  for (const r of receiptsThis as ReceiptRow[]) {
    const c = r.appointment.service.category
    byCategory.set(c, (byCategory.get(c) ?? 0) + r.total)
  }
  const sortedCats = [...byCategory.entries()].sort((a, b) => b[1] - a[1])
  const shareRows = sortedCats.length > 4
    ? [...sortedCats.slice(0, 3), ['其他', sortedCats.slice(3).reduce((s, c) => s + c[1], 0)] as [string, number]]
    : sortedCats
  const categoryShare = revenueThis > 0
    ? shareRows.map(([name, total]) => ({ name, pct: Math.round((total / revenueThis) * 100) }))
    : []

  // 本月最多人做的服務
  const serviceCount = new Map<string, number>()
  for (const a of monthAppts as { service: { name: string } }[]) {
    serviceCount.set(a.service.name, (serviceCount.get(a.service.name) ?? 0) + 1)
  }
  const topServices = [...serviceCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([name, count]) => ({ name, count }))

  // 本週每天的預約數（週一到週日）
  const weekCounts = Array<number>(7).fill(0)
  for (const a of weekAppts as { scheduledAt: Date }[]) {
    const idx = Math.floor((a.scheduledAt.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000))
    if (idx >= 0 && idx < 7) weekCounts[idx]++
  }
  const week = weekCounts.map((count, i) => {
    const d = wall(tpe(y, mo, day - mondayOffset + i))
    const dateStr = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
    return {
      label: WEEKDAYS[d.getUTCDay()],
      count,
      isToday: i === mondayOffset,
      closed: count === 0 && isClosedOn(dateStr, hours),
    }
  })

  const lowAll = (inventoryItems as StockRow[]).filter((i: StockRow) => i.quantity <= i.alertLevel)

  const data: DashboardData = {
    dateLabel: `${mo + 1}/${day} 週${WEEKDAYS[dow]}`,
    today: (todayAppts as TodayRow[]).map((a: TodayRow) => {
      const t = wall(a.scheduledAt)
      return {
        id: a.id,
        time: `${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}`,
        customerName: a.customer.name,
        serviceName: a.service.name,
        durationMin: a.service.durationMin,
        status: a.status,
        past: a.scheduledAt.getTime() < now.getTime(),
      }
    }),
    revenueThis,
    revenueLast: receiptsLast._sum.total ?? 0,
    apptCountThis,
    categoryShare,
    topServices,
    week,
    lowStock: lowAll.slice(0, 3).map(({ id, name, category, quantity, unit }: StockRow) => ({ id, name, category, quantity, unit })),
    lowStockCount: lowAll.length,
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <DashboardView data={data} />
    </div>
  )
}
