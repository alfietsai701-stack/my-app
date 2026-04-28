import { Calendar, Users, TrendingUp, Package } from 'lucide-react'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'

const recentAppointments = [
  { name: '王小明', service: '臉部保養', time: '今日 10:00', status: 'confirmed' },
  { name: '李美華', service: '全身放鬆', time: '今日 14:00', status: 'completed' },
  { name: '陳志偉', service: '頭皮護理', time: '明日 11:00', status: 'confirmed' },
  { name: '林佳君', service: '臉部保養', time: '明日 15:30', status: 'confirmed' },
]

const statusConfig: Record<string, { label: string; style: string }> = {
  confirmed: { label: '已確認', style: 'text-[var(--t-accent)] border border-[var(--t-accent-bg)]' },
  completed: { label: '已完成', style: 'text-[#6B9E78] border border-[rgba(107,158,120,0.2)]' },
  cancelled:  { label: '已取消', style: 'text-[#A06060] border border-[rgba(160,96,96,0.2)]' },
}

export default async function DashboardPage() {
  const inventoryItems = await prisma.inventoryItem.findMany({ select: { quantity: true, alertLevel: true } })
  const lowStockCount = inventoryItems.filter(i => i.quantity <= i.alertLevel).length

  const statsCards = [
    { label: '本月收入',   value: 'NT$ 28,500', sub: '較上月 +12%',   icon: TrendingUp, accent: true,  href: '/reports'   },
    { label: '本月預約',   value: '48 筆',       sub: '已完成 36 筆',  icon: Calendar,                  href: '/appointments' },
    { label: '顧客總數',   value: '124 位',      sub: '本月新增 8 位', icon: Users,                     href: '/customers' },
    { label: '低庫存品項', value: `${lowStockCount} 項`, sub: lowStockCount > 0 ? '需補貨' : '庫存充足', icon: Package, warn: lowStockCount > 0, href: '/inventory' },
  ]

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <header className="h-14 border-b border-[var(--t-border)] bg-[var(--t-surface)] flex items-center justify-between px-8 shrink-0">
        <p className="text-[10px] tracking-[0.35em] text-[var(--t-text-3)] uppercase">總覽</p>
        <button className="border border-[var(--t-accent)] text-[var(--t-accent)] hover:bg-[var(--t-accent)] hover:text-[var(--t-accent-fg)] px-5 py-1.5 text-[10px] tracking-[0.2em] uppercase transition-all duration-200">
          新增預約
        </button>
      </header>

      <main className="flex-1 bg-[var(--t-bg)] p-4 lg:p-8 overflow-auto">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 mb-8 lg:mb-10">
          {statsCards.map(({ label, value, sub, icon: Icon, accent, warn, href }) => (
            <Link key={label} href={href}
              className="bg-[var(--t-surface)] border border-[var(--t-border)] p-6 hover:border-[var(--t-border-s)] transition-colors group block">
              <div className="flex items-start justify-between mb-5">
                <p className="text-[10px] text-[var(--t-text-3)] tracking-[0.25em] uppercase leading-relaxed">{label}</p>
                <Icon size={13} strokeWidth={1.5} className={warn ? 'text-[#A06060]' : 'text-[var(--t-accent)]'} />
              </div>
              <p className={`text-[1.6rem] font-extralight tracking-tight leading-none mb-2 ${
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
            <span className="text-[10px] text-[var(--t-text-4)] tracking-wide">4 筆</span>
          </div>
          <div className="overflow-x-auto"><table className="w-full min-w-[480px]">
            <thead>
              <tr className="border-b border-[var(--t-border)]">
                {['顧客', '服務', '時間', '狀態'].map((h) => (
                  <th key={h} className="text-left text-[10px] font-normal text-[var(--t-text-4)] tracking-[0.25em] uppercase px-8 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentAppointments.map((appt, i) => (
                <tr key={i} className="border-b border-[var(--t-border)] last:border-0 hover:bg-[var(--t-bg)] transition-colors">
                  <td className="text-sm font-light text-[var(--t-text)] px-8 py-4 tracking-wide">{appt.name}</td>
                  <td className="text-xs text-[var(--t-text-2)] px-8 py-4 tracking-wide">{appt.service}</td>
                  <td className="text-xs text-[var(--t-text-3)] px-8 py-4 tracking-wide">{appt.time}</td>
                  <td className="px-8 py-4">
                    <span className={`px-3 py-1 text-[10px] tracking-[0.15em] ${statusConfig[appt.status].style}`}>
                      {statusConfig[appt.status].label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      </main>
    </div>
  )
}
