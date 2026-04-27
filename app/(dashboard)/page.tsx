import { Calendar, Users, TrendingUp, Package } from 'lucide-react'

const statsCards = [
  { label: '本月收入',   value: 'NT$ 28,500', sub: '較上月 +12%',  icon: TrendingUp, accent: true  },
  { label: '本月預約',   value: '48 筆',       sub: '已完成 36 筆', icon: Calendar                  },
  { label: '顧客總數',   value: '124 位',      sub: '本月新增 8 位',icon: Users                     },
  { label: '低庫存品項', value: '3 項',        sub: '需補貨',       icon: Package,    warn: true    },
]

const recentAppointments = [
  { name: '王小明', service: '臉部保養', time: '今日 10:00', status: 'confirmed' },
  { name: '李美華', service: '全身放鬆', time: '今日 14:00', status: 'completed' },
  { name: '陳志偉', service: '頭皮護理', time: '明日 11:00', status: 'confirmed' },
  { name: '林佳君', service: '臉部保養', time: '明日 15:30', status: 'confirmed' },
]

const statusStyles: Record<string, string> = {
  confirmed: 'bg-[#C9A96E]/10 text-[#C9A96E]',
  completed: 'bg-[#68A877]/10 text-[#68A877]',
  cancelled:  'bg-[#B57070]/10 text-[#B57070]',
}

const statusLabels: Record<string, string> = {
  confirmed: '已確認',
  completed: '已完成',
  cancelled:  '已取消',
}

export default function DashboardPage() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-[#1E1E22] bg-[#0D0D0F] flex items-center justify-between px-8 shrink-0">
        <div>
          <h2 className="text-sm font-medium text-[#F4F0E8] tracking-wide">總覽</h2>
        </div>
        <button className="bg-[#C9A96E] hover:bg-[#D4B87A] text-[#0D0D0F] rounded-xl px-5 py-2 text-xs font-medium tracking-wider transition-colors">
          新增預約
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 bg-[#0D0D0F] p-8 overflow-auto">

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {statsCards.map(({ label, value, sub, icon: Icon, accent, warn }) => (
            <div key={label} className="bg-[#111113] border border-[#1E1E22] rounded-2xl p-5 hover:border-[#2E2E33] transition-colors">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] text-[#6A6460] tracking-widest uppercase">{label}</p>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${warn ? 'bg-[#B57070]/10' : 'bg-[#C9A96E]/8'}`}>
                  <Icon size={13} className={warn ? 'text-[#B57070]' : 'text-[#C9A96E]'} strokeWidth={1.5} />
                </div>
              </div>
              <p className={`text-2xl font-light tracking-tight mb-1 ${warn ? 'text-[#B57070]' : accent ? 'text-[#C9A96E]' : 'text-[#F4F0E8]'}`}>
                {value}
              </p>
              <p className="text-[10px] text-[#3A3A40]">{sub}</p>
            </div>
          ))}
        </div>

        {/* Recent appointments */}
        <div className="bg-[#111113] border border-[#1E1E22] rounded-2xl overflow-hidden">
          <div className="px-7 py-5 border-b border-[#1E1E22] flex items-center justify-between">
            <h3 className="text-xs font-medium text-[#F4F0E8] tracking-widest uppercase">近期預約</h3>
            <span className="text-[10px] text-[#3A3A40] tracking-wider">4 筆</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1A1A1D]">
                {['顧客', '服務', '時間', '狀態'].map((h) => (
                  <th key={h} className="text-left text-[10px] font-medium text-[#3A3A40] tracking-widest uppercase px-7 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentAppointments.map((appt, i) => (
                <tr key={i} className="border-b border-[#1A1A1D] last:border-0 hover:bg-[#18181B] transition-colors">
                  <td className="text-sm text-[#F4F0E8] font-light px-7 py-4">{appt.name}</td>
                  <td className="text-xs text-[#A09890] px-7 py-4">{appt.service}</td>
                  <td className="text-xs text-[#6A6460] px-7 py-4">{appt.time}</td>
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
