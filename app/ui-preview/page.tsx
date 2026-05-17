import {
  BarChart3,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Leaf,
  Package,
  Search,
  Sparkles,
  Users,
} from 'lucide-react'

const navItems = [
  { icon: BarChart3, label: '總覽', active: true },
  { icon: CalendarDays, label: '預約' },
  { icon: Users, label: '顧客' },
  { icon: Sparkles, label: '服務' },
  { icon: Package, label: '庫存' },
]

const stats = [
  { label: '今日預約', value: '12', sub: '3 筆待確認', tone: 'sage' },
  { label: '本月收入', value: 'NT$ 86,400', sub: '較上月 +12%', tone: 'gold' },
  { label: '新顧客', value: '28', sub: '本月新增', tone: 'rose' },
]

const appointments = [
  { time: '10:30', name: '林依婷', service: '深層保濕護理', status: '已確認' },
  { time: '13:00', name: '張雅雯', service: '肩頸芳療舒壓', status: '待確認' },
  { time: '15:30', name: '陳品潔', service: '頭皮放鬆護理', status: '已確認' },
]

const customers = [
  { name: '林依婷', phone: '0912 345 678', visits: 8, last: '5/16' },
  { name: '張雅雯', phone: '0928 221 790', visits: 3, last: '5/14' },
  { name: '陳品潔', phone: '0987 450 136', visits: 12, last: '5/12' },
]

const services = ['臉部保養', '芳療按摩', '頭皮護理']
const times = ['10:30', '11:30', '13:00', '14:30', '16:00', '17:00']

export default function UiPreviewPage() {
  return (
    <main className="min-h-screen bg-[#F6F3ED] text-[#2E2A24]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 border-b border-[#DED6CB] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 border border-[#D7CABB] bg-[#FBFAF7] px-3 py-1.5 text-[11px] font-medium tracking-[0.22em] text-[#6F8F7A]">
              <Leaf size={13} />
              UI PREVIEW
            </div>
            <h1 className="text-3xl font-semibold tracking-normal text-[#2E2A24] sm:text-4xl">
              日系極簡沙龍風
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#746C61]">
              以象牙白、暖灰、鼠尾草綠與香檳金建立安靜但有質感的後台體驗，保留資訊密度，讓預約、顧客與營運數字都更好掃讀。
            </p>
          </div>
          <div className="grid grid-cols-5 gap-2 sm:flex">
            {['#F6F3ED', '#FFFFFF', '#6F8F7A', '#B08A5B', '#2E2A24'].map(color => (
              <div key={color} className="h-10 min-w-10 border border-[#D7CABB]" style={{ background: color }} />
            ))}
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-[260px_1fr]">
          <aside className="border border-[#DED6CB] bg-[#FBFAF7] p-4">
            <div className="mb-7 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center bg-[#6F8F7A] text-white">
                <Sparkles size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold">美業管理後台</p>
                <p className="text-xs text-[#9A9084]">Salon Operations</p>
              </div>
            </div>
            <nav className="space-y-1">
              {navItems.map(({ icon: Icon, label, active }) => (
                <div
                  key={label}
                  className="flex h-11 items-center gap-3 px-3 text-sm font-medium"
                  style={{
                    background: active ? '#6F8F7A' : 'transparent',
                    color: active ? '#FFFFFF' : '#746C61',
                  }}
                >
                  <Icon size={17} />
                  {label}
                </div>
              ))}
            </nav>
            <div className="mt-8 border-t border-[#E4DDD4] pt-4">
              <div className="flex items-center gap-3 bg-[#EFE9DF] px-3 py-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-[#B08A5B] text-xs font-semibold text-white">王</div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">王店長</p>
                  <p className="text-[11px] text-[#9A9084]">管理員</p>
                </div>
              </div>
            </div>
          </aside>

          <div className="space-y-6">
            <section className="border border-[#DED6CB] bg-white">
              <div className="flex flex-col gap-4 border-b border-[#E4DDD4] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[11px] font-medium tracking-[0.24em] text-[#9A9084]">DASHBOARD</p>
                  <h2 className="mt-1 text-xl font-semibold">今日營運總覽</h2>
                </div>
                <div className="flex h-10 items-center gap-2 border border-[#D7CABB] bg-[#FBFAF7] px-3 text-sm text-[#746C61]">
                  <Search size={15} />
                  <span>搜尋顧客、電話或預約</span>
                </div>
              </div>

              <div className="grid gap-4 p-5 lg:grid-cols-3">
                {stats.map(stat => (
                  <div key={stat.label} className="border border-[#E4DDD4] bg-[#FBFAF7] p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-[#746C61]">{stat.label}</p>
                      <span className={toneClass(stat.tone)} />
                    </div>
                    <p className="mt-5 text-2xl font-semibold">{stat.value}</p>
                    <p className="mt-1 text-xs text-[#9A9084]">{stat.sub}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="border border-[#DED6CB] bg-white">
                <div className="flex items-center justify-between border-b border-[#E4DDD4] px-5 py-4">
                  <h2 className="text-sm font-semibold">今日預約</h2>
                  <button className="flex items-center gap-1 text-xs font-medium text-[#6F8F7A]">
                    查看全部 <ChevronRight size={14} />
                  </button>
                </div>
                <div className="divide-y divide-[#E4DDD4]">
                  {appointments.map(item => (
                    <div key={item.time} className="grid grid-cols-[64px_1fr_auto] items-center gap-4 px-5 py-4">
                      <div className="text-sm font-semibold tabular-nums text-[#6F8F7A]">{item.time}</div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.name}</p>
                        <p className="truncate text-xs text-[#746C61]">{item.service}</p>
                      </div>
                      <span className="border border-[#D7CABB] bg-[#FBFAF7] px-2.5 py-1 text-[11px] text-[#746C61]">
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-[#DED6CB] bg-white">
                <div className="border-b border-[#E4DDD4] px-5 py-4">
                  <h2 className="text-sm font-semibold">顧客列表</h2>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E4DDD4] bg-[#FBFAF7] text-left text-[11px] font-medium text-[#9A9084]">
                      <th className="px-5 py-3">姓名</th>
                      <th className="px-5 py-3">次數</th>
                      <th className="px-5 py-3 text-right">最近</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4DDD4] text-sm">
                    {customers.map(customer => (
                      <tr key={customer.phone}>
                        <td className="px-5 py-4">
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-xs text-[#9A9084]">{customer.phone}</p>
                        </td>
                        <td className="px-5 py-4 text-[#746C61]">{customer.visits}</td>
                        <td className="px-5 py-4 text-right text-[#746C61]">{customer.last}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="border border-[#DED6CB] bg-white p-5">
            <p className="text-[11px] font-medium tracking-[0.24em] text-[#9A9084]">PUBLIC BOOKING</p>
            <h2 className="mt-1 text-xl font-semibold">線上預約頁樣式</h2>
            <div className="mt-5 border border-[#E4DDD4] bg-[#FBFAF7] p-4">
              <p className="mb-3 text-sm font-semibold">選擇服務類別</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {services.map((service, index) => (
                  <button
                    key={service}
                    className="border px-3 py-3 text-left text-sm font-medium"
                    style={{
                      borderColor: index === 0 ? '#6F8F7A' : '#DED6CB',
                      background: index === 0 ? 'rgba(111,143,122,0.12)' : '#FFFFFF',
                      color: index === 0 ? '#4F735C' : '#746C61',
                    }}
                  >
                    {service}
                  </button>
                ))}
              </div>
              <p className="mb-3 mt-6 text-sm font-semibold">可預約時段</p>
              <div className="grid grid-cols-3 gap-2">
                {times.map((time, index) => (
                  <button
                    key={time}
                    className="h-11 border text-sm font-semibold tabular-nums"
                    style={{
                      borderColor: index === 2 ? '#6F8F7A' : '#DED6CB',
                      background: index === 2 ? '#6F8F7A' : '#FFFFFF',
                      color: index === 2 ? '#FFFFFF' : '#2E2A24',
                    }}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="border border-[#DED6CB] bg-[#2E2A24] p-5 text-white">
            <p className="text-[11px] font-medium tracking-[0.24em] text-[#D6C6AA]">STYLE TOKENS</p>
            <h2 className="mt-1 text-xl font-semibold">建議套用的設計語言</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ['主背景', '#F6F3ED'],
                ['表面', '#FFFFFF'],
                ['主色', '#6F8F7A'],
                ['強調', '#B08A5B'],
                ['文字', '#2E2A24'],
                ['邊線', '#DED6CB'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between border border-white/10 bg-white/5 px-4 py-3">
                  <span className="text-sm text-[#EDE5D9]">{label}</span>
                  <span className="font-mono text-xs text-[#D6C6AA]">{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-start gap-3 border border-white/10 bg-white/5 p-4">
              <Check className="mt-0.5 text-[#A9C4AE]" size={18} />
              <p className="text-sm leading-6 text-[#EDE5D9]">
                這版偏安靜、耐看，適合長時間管理使用；預約頁也能延伸同一套語言，維持顧客端與後台的一致感。
              </p>
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-2 border-t border-[#DED6CB] py-5 text-xs text-[#746C61] sm:flex-row sm:items-center sm:justify-between">
          <span>Preview route: /ui-preview</span>
          <span className="flex items-center gap-2"><Clock3 size={13} /> 可先確認方向，再套用到全站 token 與元件</span>
        </footer>
      </div>
    </main>
  )
}

function toneClass(tone: string) {
  const base = 'block size-2.5 rounded-full'
  if (tone === 'gold') return `${base} bg-[#B08A5B]`
  if (tone === 'rose') return `${base} bg-[#B98278]`
  return `${base} bg-[#6F8F7A]`
}
