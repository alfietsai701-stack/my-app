import { Calendar, Users, TrendingUp, Package } from 'lucide-react'

const statsCards = [
  { label: '本月收入',   value: 'NT$ 28,500', sub: '較上月 +12%',   icon: TrendingUp, accent: true  },
  { label: '本月預約',   value: '48 筆',       sub: '已完成 36 筆',  icon: Calendar                  },
  { label: '顧客總數',   value: '124 位',      sub: '本月新增 8 位', icon: Users                     },
  { label: '低庫存品項', value: '3 項',        sub: '需補貨',        icon: Package,    warn: true    },
]

const recentAppointments = [
  { name: '王小明', service: '臉部保養', time: '今日 10:00', status: 'confirmed' },
  { name: '李美華', service: '全身放鬆', time: '今日 14:00', status: 'completed' },
  { name: '陳志偉', service: '頭皮護理', time: '明日 11:00', status: 'confirmed' },
  { name: '林佳君', service: '臉部保養', time: '明日 15:30', status: 'confirmed' },
]

const statusStyles: Record<string, string> = {
  confirmed: 'bg-[rgba(201,169,110,0.1)] text-[#C9A96E]',
  completed: 'bg-[rgba(104,168,119,0.1)] text-[#68A877]',
  cancelled:  'bg-[rgba(181,112,112,0.1)] text-[#B57070]',
}
const statusLabels: Record<string, string> = { confirmed: '已確認', completed: '已完成', cancelled: '已取消' }

export default function DashboardPage() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <header className="h-14 border-b border-[var(--t-border)] bg-[var(--t-surface)] flex items-center justify-between px-8 shrink-0">
        <h2 className="text-sm font-medium text-[var(--t-text)] tracking-wide">總覽</h2>
        <button className="bg-[var(--t-gold)] hover:bg-[var(--t-gold-h)] text-[var(--t-gold-fg)] rounded-xl px-5 py-2 text-xs font-medium tracking-wider transition-colors">
          新增預約
        </button>
      </header>

      <main className="flex-1 bg-[var(--t-bg)] p-8 overflow-auto">
        <div className="grid grid-cols-4 gap-4 mb-8">
          {statsCards.map(({ label, value, sub, icon: Icon, accent, warn }) => (
            <div key={label} className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl p-5 hover:border-[var(--t-border-s)] transition-colors">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] text-[var(--t-text-3)] tracking-widest uppercase">{label}</p>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[var(--t-gold-bg)]">
                  <Icon size={13} className={warn ? 'text-[#B57070]' : 'text-[var(--t-gold)]'} strokeWidth={1.5} />
                </div>
              </div>
              <p className={`text-2xl font-light tracking-tight mb-1 ${warn ? 'text-[#B57070]' : accent ? 'text-[var(--t-gold)]' : 'text-[var(--t-text)]'}`}>
                {value}
              </p>
              <p className="text-[10px] text-[var(--t-text-4)]">{sub}</p>
            </div>
          ))}
        </div>

        <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl overflow-hidden">
          <div className="px-7 py-5 border-b border-[var(--t-border)] flex items-center justify-between">
            <h3 className="text-xs font-medium text-[var(--t-text)] tracking-widest uppercase">近期預約</h3>
            <span className="text-[10px] text-[var(--t-text-4)] tracking-wider">4 筆</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--t-border)]">
                {['顧客', '服務', '時間', '狀態'].map((h) => (
                  <th key={h} className="text-left text-[10px] font-medium text-[var(--t-text-4)] tracking-widest uppercase px-7 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentAppointments.map((appt, i) => (
                <tr key={i} className="border-b border-[var(--t-border)] last:border-0 hover:bg-[var(--t-elevated)] transition-colors">
                  <td className="text-sm text-[var(--t-text)] font-light px-7 py-4">{appt.name}</td>
                  <td className="text-xs text-[var(--t-text-2)] px-7 py-4">{appt.service}</td>
                  <td className="text-xs text-[var(--t-text-3)] px-7 py-4">{appt.time}</td>
                  <td className="px-7 py-4">
                    <span className={`rounded-full px-3 py-1 text-[10px] font-medium tracking-wider ${statusStyles[appt.status]}`}>
                      {statusLabels[appt.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
