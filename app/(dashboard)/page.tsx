import { Calendar, Users, TrendingUp, Package, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  confirmed: { label: '已確認', color: '#B99868', bg: 'rgba(185,152,104,0.14)' },
  completed: { label: '已完成', color: '#6F8F74', bg: 'rgba(111,143,116,0.12)' },
  cancelled:  { label: '已取消', color: '#B85C50', bg: 'rgba(184,92,80,0.10)' },
}

function pctLabel(curr: number, prev: number) {
  if (prev === 0) return curr > 0 ? '本月開始累積' : '尚無資料'
  const p = Math.round(((curr - prev) / prev) * 100)
  if (p === 0) return '與上月持平'
  return p > 0 ? `↑ 較上月 +${p}%` : `↓ 較上月 ${p}%`
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
      take: 6,
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
      icon: TrendingUp,
      iconColor: '#B99868',
      iconBg: 'rgba(185,152,104,0.14)',
      href: '/reports',
      highlight: true,
    },
    {
      label: '本月預約',
      value: apptCountThis > 0 ? `${apptCountThis} 筆` : '—',
      sub: apptCountThis > 0 ? `已完成 ${apptCountCompleted} 筆` : pctLabel(apptCountThis, apptCountLast),
      icon: Calendar,
      iconColor: '#7E6047',
      iconBg: 'rgba(126,96,71,0.12)',
      href: '/appointments',
    },
    {
      label: '顧客總數',
      value: customerCount > 0 ? `${customerCount} 位` : '—',
      sub: newCustomerCount > 0 ? `本月新增 ${newCustomerCount} 位` : '本月無新增',
      icon: Users,
      iconColor: '#6F8F74',
      iconBg: 'rgba(111,143,116,0.12)',
      href: '/customers',
    },
    {
      label: '低庫存品項',
      value: `${lowStockCount} 項`,
      sub: lowStockCount > 0 ? '⚠ 需要補貨' : '庫存充足',
      icon: Package,
      iconColor: lowStockCount > 0 ? '#B85C50' : '#B8842B',
      iconBg: lowStockCount > 0 ? 'rgba(184,92,80,0.10)' : 'rgba(184,132,43,0.12)',
      href: '/inventory',
      warn: lowStockCount > 0,
    },
  ]

  const fmtTime = (d: Date) => d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
  const fmtDateLabel = (d: Date) => {
    const today = new Date(); today.setHours(0,0,0,0)
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
    const apptDay = new Date(d); apptDay.setHours(0,0,0,0)
    const prefix = apptDay.getTime() === today.getTime()
      ? '今日' : apptDay.getTime() === tomorrow.getTime()
      ? '明日' : d.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })
    return `${prefix} ${fmtTime(d)}`
  }

  const monthLabel = `${now.getFullYear()} 年 ${now.getMonth() + 1} 月`

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* ── Header ── */}
      <div className="shrink-0 px-5 lg:px-8 py-5 lg:py-6" style={{ background: 'var(--t-surface)', borderBottom: '1px solid var(--t-border)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--t-text)' }}>總覽</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--t-text-4)' }}>{monthLabel}</p>
          </div>
          <Link href="/appointments"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'var(--t-accent)', color: 'var(--t-accent-fg)' }}>
            + 新增預約
          </Link>
        </div>
      </div>

      <main className="flex-1 overflow-auto px-5 lg:px-8 py-5 lg:py-6" style={{ background: 'var(--t-bg)' }}>

        {/* ── Stats grid ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statsCards.map(({ label, value, sub, icon: Icon, iconColor, iconBg, href, highlight, warn }) => (
            <Link key={label} href={href}
              className="rounded-2xl p-5 block transition-all hover:scale-[1.01]"
              style={{ background: 'var(--t-surface)', boxShadow: 'var(--t-shadow)' }}>
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: iconBg }}>
                  <Icon size={18} strokeWidth={2} style={{ color: iconColor }} />
                </div>
                <ChevronRight size={14} strokeWidth={2} style={{ color: 'var(--t-text-4)' }} />
              </div>
              <p className="text-2xl font-bold mb-1" style={{
                color: warn ? '#DC2626' : highlight ? 'var(--t-accent)' : 'var(--t-text)',
              }}>
                {value}
              </p>
              <p className="text-xs" style={{ color: 'var(--t-text-4)' }}>{label}</p>
              <p className="text-[11px] mt-1 font-medium" style={{
                color: warn ? '#DC2626' : sub.startsWith('↑') ? '#059669' : sub.startsWith('↓') ? '#DC2626' : 'var(--t-text-3)',
              }}>
                {sub}
              </p>
            </Link>
          ))}
        </div>

        {/* ── Upcoming appointments ── */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--t-surface)', boxShadow: 'var(--t-shadow)' }}>
          <div className="px-5 lg:px-6 py-4 flex items-center justify-between"
            style={{ borderBottom: '1px solid var(--t-border)' }}>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--t-text)' }}>今日以後預約</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--t-text-4)' }}>最近 6 筆</p>
            </div>
            <Link href="/appointments"
              className="text-xs font-medium flex items-center gap-1 transition-colors"
              style={{ color: 'var(--t-accent)' }}>
              查看全部 <ChevronRight size={13} strokeWidth={2} />
            </Link>
          </div>

          {recentAppts.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'var(--t-elevated)' }}>
                <Calendar size={22} strokeWidth={1.5} style={{ color: 'var(--t-text-4)' }} />
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--t-text-3)' }}>尚無預約</p>
              <p className="text-xs mt-1" style={{ color: 'var(--t-text-4)' }}>點擊「新增預約」建立第一筆</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--t-border)' }}>
              {recentAppts.map((appt) => {
                const cfg = statusConfig[appt.status] ?? statusConfig.confirmed
                return (
                  <div key={appt.id} className="flex items-center gap-4 px-5 lg:px-6 py-4 hover:bg-[var(--t-elevated)] transition-colors">
                    {/* Time block */}
                    <div className="w-14 shrink-0 text-center">
                      <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--t-text)' }}>
                        {fmtTime(appt.scheduledAt)}
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--t-text-4)' }}>
                        {fmtDateLabel(appt.scheduledAt).split(' ')[0]}
                      </p>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-8 shrink-0" style={{ background: 'var(--t-border)' }} />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--t-text)' }}>
                        {appt.customer.name}
                      </p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--t-text-3)' }}>
                        {appt.service.name}
                      </p>
                    </div>

                    {/* Status badge */}
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0"
                      style={{ color: cfg.color, background: cfg.bg }}>
                      {cfg.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
