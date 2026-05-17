import {
  CalendarDays,
  ChevronRight,
  Crown,
  Gem,
  HandHeart,
  Package,
  Search,
  Sparkles,
  Star,
  TrendingUp,
  UserRound,
  WalletCards,
} from 'lucide-react'

const navItems = [
  { icon: Crown, label: '總覽', active: true },
  { icon: CalendarDays, label: '預約' },
  { icon: UserRound, label: '顧客' },
  { icon: Gem, label: '服務' },
  { icon: Package, label: '庫存' },
]

const stats = [
  { label: '今日預約', value: '14', sub: '4 筆高單價療程', color: '#B99868' },
  { label: '本月營收', value: 'NT$ 168K', sub: '較上月 +16%', color: '#7E6047' },
  { label: '回訪顧客', value: '42', sub: '本月回訪', color: '#C98F82' },
]

const appointments = [
  { time: '10:30', name: '林依婷', service: '鑽石保濕護理', status: '已確認' },
  { time: '13:00', name: '張雅雯', service: '奢華芳療舒壓', status: '待確認' },
  { time: '15:30', name: '陳品潔', service: '玫瑰煥膚課程', status: '已確認' },
]

const customers = [
  { name: '林依婷', tier: 'Gold', visits: 8, spend: 'NT$ 38K' },
  { name: '張雅雯', tier: 'VIP', visits: 15, spend: 'NT$ 92K' },
  { name: '陳品潔', tier: 'Silver', visits: 5, spend: 'NT$ 21K' },
]

const services = ['臉部保養', '芳療按摩', '煥膚課程']
const times = ['10:30', '11:30', '13:00', '14:30', '16:00', '17:00']

export default function CreamPreviewPage() {
  return (
    <main className="min-h-screen bg-[#F8F1E6] text-[#33281E]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <header className="border border-[#E4D3BE] bg-[#FFFDFC]">
          <div className="grid gap-0 lg:grid-cols-[1fr_380px]">
            <div className="p-6 sm:p-8">
              <div className="mb-4 inline-flex items-center gap-2 border border-[#DCC7AA] bg-[#FAF4EA] px-3 py-1.5 text-[11px] font-semibold tracking-[0.22em] text-[#9B744A]">
                <Sparkles size={14} />
                LUXE CREAM PREVIEW
              </div>
              <h1 className="text-3xl font-semibold tracking-normal text-[#33281E] sm:text-4xl">
                靜奢奶油風
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#76685B]">
                奶油白、暖灰、香檳金與深咖搭配，視覺柔和但有高級感。適合 SPA、美容、皮膚管理或想走精品沙龍調性的品牌。
              </p>
            </div>
            <div className="border-t border-[#E4D3BE] bg-[#3B2D22] p-6 text-white lg:border-l lg:border-t-0">
              <p className="text-[11px] font-semibold tracking-[0.22em] text-[#E8D2AF]">MOOD</p>
              <div className="mt-5 grid grid-cols-5 gap-2">
                {['#F8F1E6', '#FFFDFC', '#B99868', '#7E6047', '#33281E'].map(color => (
                  <div key={color} className="h-12 border border-white/20" style={{ background: color }} />
                ))}
              </div>
              <p className="mt-5 text-sm leading-6 text-[#F1E4D2]">
                比醫美版更溫柔，比日系版更華麗；適合顧客端預約頁和品牌形象一起升級。
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-[272px_1fr]">
          <aside className="border border-[#E4D3BE] bg-[#FFFDFC] p-4">
            <div className="mb-7 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center bg-[#B99868] text-white">
                <Crown size={19} />
              </div>
              <div>
                <p className="text-sm font-semibold">美業管理後台</p>
                <p className="text-xs text-[#9A8A7B]">Luxury Salon OS</p>
              </div>
            </div>
            <nav className="space-y-1">
              {navItems.map(({ icon: Icon, label, active }) => (
                <div
                  key={label}
                  className="flex h-11 items-center gap-3 px-3 text-sm font-medium"
                  style={{
                    background: active ? '#B99868' : 'transparent',
                    color: active ? '#FFFFFF' : '#76685B',
                  }}
                >
                  <Icon size={17} />
                  {label}
                </div>
              ))}
            </nav>
            <div className="mt-8 border-t border-[#EADBC8] pt-4">
              <div className="bg-[#FAF4EA] px-3 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold">VIP 回訪率</p>
                  <Star size={14} className="text-[#B99868]" />
                </div>
                <p className="mt-3 text-2xl font-semibold text-[#7E6047]">68%</p>
                <p className="text-[11px] text-[#9A8A7B]">本月會員回訪</p>
              </div>
            </div>
          </aside>

          <div className="space-y-6">
            <section className="border border-[#E4D3BE] bg-[#FFFDFC]">
              <div className="flex flex-col gap-4 border-b border-[#EADBC8] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.24em] text-[#9A8A7B]">SALON DASHBOARD</p>
                  <h2 className="mt-1 text-xl font-semibold">今日精品服務總覽</h2>
                </div>
                <div className="flex h-10 items-center gap-2 border border-[#DCC7AA] bg-[#FAF4EA] px-3 text-sm text-[#76685B]">
                  <Search size={15} />
                  <span>搜尋顧客、服務或會員等級</span>
                </div>
              </div>
              <div className="grid gap-4 p-5 lg:grid-cols-3">
                {stats.map(stat => (
                  <div key={stat.label} className="border border-[#EADBC8] bg-[#FAF4EA] p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-[#76685B]">{stat.label}</p>
                      <span className="block size-2.5 rounded-full" style={{ background: stat.color }} />
                    </div>
                    <p className="mt-5 text-2xl font-semibold text-[#33281E]">{stat.value}</p>
                    <p className="mt-1 text-xs text-[#9A8A7B]">{stat.sub}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="border border-[#E4D3BE] bg-[#FFFDFC]">
                <div className="flex items-center justify-between border-b border-[#EADBC8] px-5 py-4">
                  <h2 className="text-sm font-semibold">今日預約</h2>
                  <button className="flex items-center gap-1 text-xs font-semibold text-[#9B744A]">
                    查看全部 <ChevronRight size={14} />
                  </button>
                </div>
                <div className="divide-y divide-[#EADBC8]">
                  {appointments.map(item => (
                    <div key={item.time} className="grid grid-cols-[64px_1fr_auto] items-center gap-4 px-5 py-4">
                      <div className="text-sm font-semibold tabular-nums text-[#9B744A]">{item.time}</div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{item.name}</p>
                        <p className="truncate text-xs text-[#76685B]">{item.service}</p>
                      </div>
                      <span className="border border-[#DCC7AA] bg-[#FAF4EA] px-2.5 py-1 text-[11px] text-[#76685B]">
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-[#E4D3BE] bg-[#FFFDFC]">
                <div className="border-b border-[#EADBC8] px-5 py-4">
                  <h2 className="text-sm font-semibold">會員價值</h2>
                </div>
                <div className="divide-y divide-[#EADBC8]">
                  {customers.map(customer => (
                    <div key={customer.name} className="px-5 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold">{customer.name}</p>
                        <span className="bg-[#F2E5D4] px-2 py-1 text-[11px] text-[#7E6047]">{customer.tier}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-[#76685B]">
                        <span>{customer.visits} 次回訪</span>
                        <span>{customer.spend}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="border border-[#E4D3BE] bg-[#FFFDFC] p-5">
            <p className="text-[11px] font-semibold tracking-[0.24em] text-[#9A8A7B]">PUBLIC BOOKING</p>
            <h2 className="mt-1 text-xl font-semibold">顧客端預約樣式</h2>
            <div className="mt-5 border border-[#EADBC8] bg-[#FAF4EA] p-4">
              <p className="mb-3 text-sm font-semibold">選擇服務類別</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {services.map((service, index) => (
                  <button
                    key={service}
                    className="border px-3 py-3 text-left text-sm font-semibold"
                    style={{
                      borderColor: index === 0 ? '#B99868' : '#DCC7AA',
                      background: index === 0 ? '#F2E5D4' : '#FFFDFC',
                      color: index === 0 ? '#7E6047' : '#76685B',
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
                      borderColor: index === 2 ? '#B99868' : '#DCC7AA',
                      background: index === 2 ? '#B99868' : '#FFFDFC',
                      color: index === 2 ? '#FFFFFF' : '#33281E',
                    }}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="border border-[#E4D3BE] bg-[#3B2D22] p-5 text-white">
            <p className="text-[11px] font-semibold tracking-[0.24em] text-[#E8D2AF]">DESIGN TOKENS</p>
            <h2 className="mt-1 text-xl font-semibold">奶油版建議 token</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ['背景', '#F8F1E6'],
                ['表面', '#FFFDFC'],
                ['主色', '#B99868'],
                ['深色', '#7E6047'],
                ['文字', '#33281E'],
                ['邊線', '#E4D3BE'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between border border-white/10 bg-white/5 px-4 py-3">
                  <span className="text-sm text-[#F1E4D2]">{label}</span>
                  <span className="font-mono text-xs text-[#E8D2AF]">{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="border border-white/10 bg-white/5 p-4">
                <HandHeart className="mb-3 text-[#E8D2AF]" size={20} />
                <p className="text-sm font-semibold">溫柔高級</p>
                <p className="mt-2 text-xs leading-5 text-[#F1E4D2]">適合 SPA、美容、保養型品牌，顧客端預約頁會很有質感。</p>
              </div>
              <div className="border border-white/10 bg-white/5 p-4">
                <TrendingUp className="mb-3 text-[#E8D2AF]" size={20} />
                <p className="text-sm font-semibold">較像精品沙龍</p>
                <p className="mt-2 text-xs leading-5 text-[#F1E4D2]">比醫美版更柔軟，比日系版更有品牌記憶點。</p>
              </div>
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-2 border-t border-[#E4D3BE] py-5 text-xs text-[#76685B] sm:flex-row sm:items-center sm:justify-between">
          <span>Preview route: /ui-preview/cream</span>
          <span className="flex items-center gap-2"><WalletCards size={13} /> 靜奢奶油風適合高單價與會員制服務</span>
        </footer>
      </div>
    </main>
  )
}
