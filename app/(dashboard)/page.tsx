import { Calendar, Users, TrendingUp, Package } from 'lucide-react'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'

const statusConfig: Record<string, { label: string; style: string }> = {
  confirmed: { label: '已確認', style: 'text-[var(--t-accent)] border border-[var(--t-accent-bg)]' },
  completed: { label: '已完成', style: 'text-[#6B9E78] border border-[rgba(107,158,120,0.2)]' },
  cancelled:  { label: '已取消', style: 'text-[#A06060] border border-[rgba(160,96,96,0.2)]' },
}

function pctLabel(curr: number, prev: number) {
  if (prev === 0) return curr > 0 ? '本月開始累積' : '尚無資料'
  const p = Math.round(((curr - prev) / prev) * 100)
  if (p === 0) return '與上月持平'
  return p > 0 ? `較上月 +${p}%` : `較上月 ${p}%`
}

export default async function DashboardPage() {
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

  const [
    receiptsThis, receiptsLast,
    apptCountThis, apptCountLast, apptCountCompleted,
    customerCount, newCustomerCount,
    inventoryItems,
    recentAppts,
  ] = await Promise.all([
    prisma.receipt.aggregate({ where: { paidAt: { gte: thisMonthStart } }, _sum: { total: true } }),
    prisma.receipt.aggregate({ where: { paidAt: { gte: lastMonthStart, lte: lastMonthEnd } }, _sum: { total: true } }),
    prisma.appointment.count({ where: { scheduledAt: { gte: thisMonthStart }, status: { not: 'cancelled' } } }),
    prisma.appointment.count({ where: { scheduledAt: { gte: lastMonthStart, lte: lastMonthEnd }, status: { not: 'cancelled' } } }),
    prisma.appointment.count({ where: { scheduledAt: { gte: thisMonthStart }, status: 'completed' } }),
    prisma.customer.count({ where: { deletedAt: null } }),
    prisma.customer.count({ where: { deletedAt: null, createdAt: { gte: thisMonthStart } } }),
    prisma.inventoryItem.findMany({ select: { quantity: true, alertLevel: true } }),
    prisma.appointment.findMany({
      where: { scheduledAt: { gte: new Date(now.setHours(0,0,0,0)) } },
      orderBy: { scheduledAt: 'asc' },
      take: 5,
      include: {
        customer: { select: { name: true } },
        service:  { select: { name: true } },
      },
    }),
  ])

  const revenueThis = receiptsThis._sum.total ?? 0
  const revenueLast = receiptsLast._sum.total ?? 0
  const lowStockCount = inventoryItems.filter(i => i.quantity <= i.alertLevel).length

  const statsCards = [
    {
      label: '本月收入',
      value: revenueThis > 0 ? `NT$ ${revenueThis.toLocaleString()}` : '—',
      sub: pctLabel(revenueThis, revenueLast),
      icon: TrendingUp, accent: true, href: '/reports',
    },
    {
      label: '本月預約',
      value: apptCountThis > 0 ? `${apptCountThis} 筆` : '—',
      sub: apptCountThis > 0 ? `已完成 ${apptCountCompleted} 筆` : pctLabel(apptCountThis, apptCountLast),
      icon: Calendar, href: '/appointments',
    },
    {
      label: '顧客總數',
      value: customerCount > 0 ? `${customerCount} 位` : '—',
      sub: newCustomerCount > 0 ? `本月新增 ${newCustomerCount} 位` : '本月無新增',
      icon: Users, href: '/customers',
    },
    {
      label: '低庫存品項',
      value: `${lowStockCount} 項`,
      sub: lowStockCount > 0 ? '需補貨' : '庫存充足',
      icon: Package, warn: lowStockCount > 0, href: '/inventory',
    },
  ]

  const fmtTime = (d: Date) => d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
  const fmtDateLabel = (d: Date) => {
    const today = new Date(); today.setHours(0,0,0,0)
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
    const apptDay = new Date(d); apptDay.setHours(0,0,0,0)
    const prefix = apptDay.getTime() === today.getTime() ? '今日' : apptDay.getTime() === tomorrow.getTime() ? '明日' : d.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })
    return `${prefix} ${fmtTime(d)}`
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <header className="h-14 border-b border-[var(--t-border)] bg-[var(--t-surface)] flex items-center justify-between px-4 lg:px-8 shrink-0">
        <p className="text-[10px] tracking-[0.35em] text-[var(--t-text-3)] uppercase">總覽</p>
        <Link href="/appointments"
          className="border border-[var(--t-accent)] text-[var(--t-accent)] hover:bg-[var(--t-accent)] hover:text-[var(--t-accent-fg)] px-5 py-1.5 text-[10px] tracking-[0.2em] uppercase transition-all duration-200">
          新增預約
        </Link>
      </header>

      <main className="flex-1 bg-[var(--t-bg)] p-4 lg:p-8 overflow-auto">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 mb-8 lg:mb-10">
          {statsCards.map(({ label, value, sub, icon: Icon, accent, warn, href }) => (
            <Link key={label} href={href}
              className="bg-[var(--t-surface)] border border-[var(--t-border)] p-5 lg:p-6 hover:border-[var(--t-border-s)] transition-colors block">
              <div className="flex items-start justify-between mb-4 lg:mb-5">
                <p className="text-[10px] text-[var(--t-text-3)] tracking-[0.25em] uppercase leading-relaxed">{label}</p>
                <Icon size={13} strokeWidth={1.5} className={warn ? 'text-[#A06060]' : 'text-[var(--t-accent)]'} />
              </div>
              <p className={`text-[1.4rem] lg:text-[1.6rem] font-extralight tracking-tight leading-none mb-2 ${
                warn ? 'text-[#A06060]' : accent ? 'text-[var(--t-accent)]' : 'text-[var(--t-text)]'
              }`}>
                {value}
              </p>
              <p className="text-[10px] text-[var(--t-text-4)] tracking-wide">{sub}</p>
            </Link>
          ))}
        </div>

        {/* Recent appointments */}
        <div className="bg-[var(--t-surface)] border border-[var(--t-border)] overflow-hidden">
          <div className="px-4 lg:px-8 py-4 lg:py-5 border-b border-[var(--t-border)] flex items-center justify-between">
            <p className="text-[10px] tracking-[0.35em] text-[var(--t-text-2)] uppercase">近期預約</p>
            <Link href="/appointments" className="text-[10px] text-[var(--t-text-4)] hover:text-[var(--t-accent)] tracking-wide transition-colors">
              查看全部
            </Link>
          </div>

          {recentAppts.length === 0 ? (
            <div className="px-8 py-10 text-center">
              <p className="text-xs text-[var(--t-text-3)] tracking-widest mb-1">尚無預約</p>
              <p className="text-[10px] text-[var(--t-text-4)] tracking-wide">點擊「新增預約」建立第一筆</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr className="border-b border-[var(--t-border)]">
                    {['顧客', '服務', '時間', '狀態'].map((h) => (
                      <th key={h} className="text-left text-[10px] font-normal text-[var(--t-text-4)] tracking-[0.25em] uppercase px-4 lg:px-8 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentAppts.map((appt) => (
                    <tr key={appt.id} className="border-b border-[var(--t-border)] last:border-0 hover:bg-[var(--t-bg)] transition-colors">
                      <td className="text-sm font-light text-[var(--t-text)] px-4 lg:px-8 py-4 tracking-wide">{appt.customer.name}</td>
                      <td className="text-xs text-[var(--t-text-2)] px-4 lg:px-8 py-4 tracking-wide">{appt.service.name}</td>
                      <td className="text-xs text-[var(--t-text-3)] px-4 lg:px-8 py-4 tracking-wide tabular-nums">{fmtDateLabel(appt.scheduledAt)}</td>
                      <td className="px-4 lg:px-8 py-4">
                        <span className={`px-3 py-1 text-[10px] tracking-[0.15em] ${statusConfig[appt.status]?.style ?? ''}`}>
                          {statusConfig[appt.status]?.label ?? appt.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
