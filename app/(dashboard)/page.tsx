import { Button } from '@/components/ui/button'
import { Calendar, Users, TrendingUp, Package } from 'lucide-react'

const statsCards = [
  {
    label: '本月收入',
    value: 'NT$ 28,500',
    sub: '較上月 +12%',
    icon: TrendingUp,
  },
  {
    label: '本月預約',
    value: '48 筆',
    sub: '已完成 36 筆',
    icon: Calendar,
  },
  {
    label: '顧客總數',
    value: '124 位',
    sub: '本月新增 8 位',
    icon: Users,
  },
  {
    label: '低庫存品項',
    value: '3 項',
    sub: '需補貨',
    icon: Package,
    warn: true,
  },
]

const recentAppointments = [
  { name: '王小明', service: '臉部保養', time: '今日 10:00', status: 'confirmed' },
  { name: '李美華', service: '全身放鬆', time: '今日 14:00', status: 'completed' },
  { name: '陳志偉', service: '頭皮護理', time: '明日 11:00', status: 'confirmed' },
  { name: '林佳君', service: '臉部保養', time: '明日 15:30', status: 'confirmed' },
]

const statusStyles: Record<string, string> = {
  confirmed: 'bg-[#EDE8E0] text-[#6B5E54]',
  completed: 'bg-[#D4E6D5] text-[#4A7A4E]',
  cancelled: 'bg-[#F0DADA] text-[#8B4444]',
}

const statusLabels: Record<string, string> = {
  confirmed: '已確認',
  completed: '已完成',
  cancelled: '已取消',
}

export default function DashboardPage() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-[#D6CFC4] bg-[#FDFCFA] flex items-center justify-between px-6 shrink-0">
        <h2 className="text-base font-medium text-[#2C2420]">首頁</h2>
        <div className="flex items-center gap-3">
          <Button className="bg-[#C9A87C] hover:bg-[#8B6347] text-white rounded-xl px-5 py-2.5 text-sm font-medium transition-colors">
            新增預約
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 bg-[#F5F0E8] p-6 overflow-auto">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {statsCards.map(({ label, value, sub, icon: Icon, warn }) => (
            <div
              key={label}
              className="bg-[#FDFCFA] border border-[#D6CFC4] rounded-2xl shadow-none p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-[#2C2420]">{label}</p>
                <Icon size={16} className={warn ? 'text-[#C9974A]' : 'text-[#A89990]'} />
              </div>
              <p className={`text-2xl font-medium ${warn ? 'text-[#C9974A]' : 'text-[#C9A87C]'}`}>
                {value}
              </p>
              <p className="text-xs text-[#A89990] mt-1">{sub}</p>
            </div>
          ))}
        </div>

        {/* Recent appointments */}
        <div className="bg-[#FDFCFA] border border-[#D6CFC4] rounded-2xl shadow-none">
          <div className="px-6 py-4 border-b border-[#D6CFC4]">
            <h3 className="text-base font-medium text-[#2C2420]">近期預約</h3>
          </div>
          <div className="rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#EDE8E0]">
                <tr className="border-b border-[#D6CFC4]">
                  <th className="text-left text-sm font-medium text-[#6B5E54] px-6 py-3">顧客</th>
                  <th className="text-left text-sm font-medium text-[#6B5E54] px-6 py-3">服務</th>
                  <th className="text-left text-sm font-medium text-[#6B5E54] px-6 py-3">時間</th>
                  <th className="text-left text-sm font-medium text-[#6B5E54] px-6 py-3">狀態</th>
                </tr>
              </thead>
              <tbody>
                {recentAppointments.map((appt, i) => (
                  <tr
                    key={i}
                    className="border-b border-[#D6CFC4] last:border-0 hover:bg-[#F5F0E8] transition-colors"
                  >
                    <td className="text-sm text-[#2C2420] px-6 py-3">{appt.name}</td>
                    <td className="text-sm text-[#2C2420] px-6 py-3">{appt.service}</td>
                    <td className="text-sm text-[#6B5E54] px-6 py-3">{appt.time}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`rounded-full px-3 py-0.5 text-xs font-medium ${statusStyles[appt.status]}`}
                      >
                        {statusLabels[appt.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
