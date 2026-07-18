import {
  BarChart3,
  CalendarDays,
  Clock3,
  Gem,
  Home,
  Package,
  Search,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react'

const navItems = [
  { icon: Home, label: '總覽', active: true },
  { icon: CalendarDays, label: '預約' },
  { icon: Users, label: '顧客' },
  { icon: Gem, label: '服務' },
  { icon: Package, label: '庫存' },
  { icon: BarChart3, label: '報表' },
  { icon: Settings, label: '設定' },
]

const metrics = [
  { label: '今日預約', value: '12', hint: '下一位 13:00 張雅雯' },
  { label: '本月收入', value: 'NT$ 86,400', hint: '較上月 +12%' },
  { label: '待處理', value: '5', hint: '3 筆待確認，2 筆未付款' },
  { label: '庫存警示', value: '4', hint: '精油、面膜需補貨' },
]

const appointments = [
  { time: '10:30', name: '林依婷', service: '深層保濕護理', meta: '90 分鐘 · NT$2,800', status: '已確認', tone: 'success' },
  { time: '13:00', name: '張雅雯', service: '肩頸芳療舒壓', meta: '60 分鐘 · 初訪顧客', status: '待確認', tone: 'default' },
  { time: '15:30', name: '陳品潔', service: '玫瑰煥膚課程', meta: '已建立收據 · 會員 Gold', status: '已付款', tone: 'rose' },
  { time: '17:00', name: '手動封鎖', service: '店內清潔與庫存盤點', meta: '不開放線上預約', status: '不可預約', tone: 'default' },
]

const bookingSteps = [
  ['選服務', '分類、價格、時間一次看懂', '完成'],
  ['選日期與時段', '上午/下午分組，已滿時段淡出', '進行中'],
  ['填資料', '姓名、電話、Email、備註', '待填'],
  ['確認預約', '摘要與注意事項最後確認', '待確認'],
]

export default function FigmaPreviewPage() {
  return (
    <main className="min-h-screen bg-[#F8F1E6] text-[#33281E]">
      <div className="grid min-h-screen lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="hidden border-r border-[#E4D3BE] bg-[#FFFDFC] p-4 lg:flex lg:flex-col">
          <div className="flex items-center gap-3 border-b border-[#E4D3BE] px-2 pb-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-[#B99868] text-white">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold">美業管理後台</p>
              <p className="text-xs text-[#9A8A7B]">Salon Operations</p>
            </div>
          </div>

          <nav className="mt-5 grid gap-1">
            {navItems.map(({ icon: Icon, label, active }) => (
              <button
                key={label}
                className="flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm font-semibold"
                style={{
                  background: active ? '#B99868' : 'transparent',
                  color: active ? '#FFFFFF' : '#76685B',
                }}
              >
                <Icon size={17} />
                {label}
              </button>
            ))}
          </nav>

          <div className="mt-auto border-t border-[#E4D3BE] pt-4">
            <div className="flex items-center gap-3 rounded-lg bg-[#FAF4EA] p-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-[#B99868] text-xs font-bold text-white">王</div>
              <div>
                <p className="text-xs font-semibold">王店長</p>
                <p className="text-[11px] text-[#9A8A7B]">今日值班 10:00-19:00</p>
              </div>
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="sticky top-0 z-10 flex flex-col gap-3 border-b border-[#E4D3BE] bg-[#FFFDFC]/90 px-4 py-3 backdrop-blur lg:h-[68px] lg:flex-row lg:items-center lg:justify-between lg:px-7 lg:py-0">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9B744A]">Dashboard</p>
              <h1 className="mt-0.5 text-xl font-semibold">今日營運工作台</h1>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#E4D3BE] bg-[#FFFDFC] px-3 text-sm text-[#9A8A7B] lg:w-[360px] lg:flex-none">
                <Search size={15} />
                <span className="truncate">搜尋顧客、電話、服務或預約</span>
              </div>
              <button className="hidden h-10 rounded-lg border border-[#DCC7AA] bg-[#FFFDFC] px-4 text-sm font-semibold text-[#5E4C3D] sm:block">
                封鎖時段
              </button>
              <button className="h-10 rounded-lg bg-[#B99868] px-4 text-sm font-semibold text-white">新增預約</button>
            </div>
          </header>

          <div className="grid gap-5 px-4 py-5 pb-24 lg:px-7 lg:pb-8">
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => (
                <div key={metric.label} className="rounded-lg border border-[#E4D3BE] bg-[#FFFDFC] p-4">
                  <p className="text-sm font-semibold text-[#76685B]">{metric.label}</p>
                  <p className="mt-3 text-2xl font-semibold">{metric.value}</p>
                  <p className="mt-1 text-xs text-[#9A8A7B]">{metric.hint}</p>
                </div>
              ))}
            </section>

            <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="overflow-hidden rounded-lg border border-[#E4D3BE] bg-[#FFFDFC]">
                <div className="flex items-center justify-between gap-4 border-b border-[#E4D3BE] px-4 py-3">
                  <div>
                    <h2 className="text-base font-semibold">今日排程</h2>
                    <p className="text-xs text-[#9A8A7B]">以時間為主軸，直接處理確認、收款與改期</p>
                  </div>
                  <div className="grid grid-cols-3 rounded-lg border border-[#E4D3BE] bg-[#FAF4EA] p-1 text-xs font-semibold">
                    <span className="rounded-md bg-[#FFFDFC] px-3 py-1.5">日</span>
                    <span className="px-3 py-1.5 text-[#76685B]">週</span>
                    <span className="px-3 py-1.5 text-[#76685B]">月</span>
                  </div>
                </div>

                <div className="grid lg:grid-cols-[88px_minmax(0,1fr)]">
                  <div className="hidden border-r border-[#E4D3BE] bg-[#FAF4EA] lg:block">
                    {['10:00', '11:00', '13:00', '15:00'].map((time) => (
                      <div key={time} className="h-[72px] border-b border-[#E4D3BE] pt-3 text-center text-xs font-semibold tabular-nums text-[#9A8A7B]">
                        {time}
                      </div>
                    ))}
                  </div>
                  <div className="grid gap-2 p-3">
                    {appointments.map((item) => (
                      <article
                        key={`${item.time}-${item.name}`}
                        className="grid min-h-[72px] items-center gap-3 rounded-lg border border-[#E4D3BE] bg-[#FFFDFC] p-3 sm:grid-cols-[76px_minmax(0,1fr)_auto]"
                        style={{
                          borderLeftWidth: 4,
                          borderLeftColor: item.tone === 'success' ? '#6F8F74' : item.tone === 'rose' ? '#C98F82' : '#B99868',
                        }}
                      >
                        <p className="font-mono text-sm font-bold text-[#9B744A]">{item.time}</p>
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold">{item.name}</h3>
                          <p className="truncate text-xs text-[#76685B]">{item.service} · {item.meta}</p>
                        </div>
                        <span className="w-fit rounded-full bg-[#FAF4EA] px-2.5 py-1 text-xs font-semibold text-[#76685B]">
                          {item.status}
                        </span>
                      </article>
                    ))}
                  </div>
                </div>
              </div>

              <aside className="grid gap-5 md:grid-cols-2 xl:grid-cols-1">
                <section className="rounded-lg border border-[#E4D3BE] bg-[#FFFDFC]">
                  <div className="border-b border-[#E4D3BE] px-4 py-3">
                    <h2 className="text-base font-semibold">目前選取</h2>
                    <p className="text-xs text-[#9A8A7B]">預約詳情與下一步操作</p>
                  </div>
                  <div className="grid gap-3 p-4">
                    <div className="flex items-center gap-3 border-b border-[#E4D3BE] pb-3">
                      <div className="flex size-11 items-center justify-center rounded-full bg-[#B99868] text-sm font-bold text-white">張</div>
                      <div>
                        <h3 className="font-semibold">張雅雯</h3>
                        <p className="text-xs text-[#9A8A7B]">0928 221 790 · 首次到店</p>
                      </div>
                    </div>
                    {[
                      ['服務', '肩頸芳療舒壓'],
                      ['時間', '13:00-14:00'],
                      ['狀態', '待確認'],
                      ['備註', '偏好女美容師，肩頸較緊。'],
                    ].map(([label, value]) => (
                      <div key={label} className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 text-sm">
                        <span className="text-[#9A8A7B]">{label}</span>
                        <b className="font-semibold text-[#33281E]">{value}</b>
                      </div>
                    ))}
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      {['確認', '改期', '收款', '取消'].map((action, index) => (
                        <button
                          key={action}
                          className="h-10 rounded-lg border text-sm font-semibold"
                          style={{
                            borderColor: index === 0 ? '#B99868' : '#DCC7AA',
                            background: index === 0 ? '#B99868' : '#FFFDFC',
                            color: index === 0 ? '#FFFFFF' : '#5E4C3D',
                          }}
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="rounded-lg border border-[#E4D3BE] bg-[#FFFDFC]">
                  <div className="border-b border-[#E4D3BE] px-4 py-3">
                    <h2 className="text-base font-semibold">公開預約流程</h2>
                    <p className="text-xs text-[#9A8A7B]">參考 Figma site，改為清楚步驟</p>
                  </div>
                  <div className="grid gap-3 p-4">
                    {bookingSteps.map(([title, desc, state], index) => (
                      <div key={title} className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-[#E4D3BE] bg-[#FAF4EA] p-3">
                        <span className="flex size-7 items-center justify-center rounded-full bg-[#B99868] text-xs font-bold text-white">{index + 1}</span>
                        <div>
                          <h3 className="text-sm font-semibold">{title}</h3>
                          <p className="text-xs text-[#9A8A7B]">{desc}</p>
                        </div>
                        <b className="text-xs text-[#76685B]">{state}</b>
                      </div>
                    ))}
                  </div>
                </section>
              </aside>
            </section>
          </div>

          <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-[#E4D3BE] bg-[#FFFDFC] pb-[env(safe-area-inset-bottom)] lg:hidden">
            {['總覽', '預約', '顧客', '庫存', '設定'].map((label, index) => (
              <button key={label} className="h-16 text-[11px] font-semibold" style={{ color: index === 0 ? '#9B744A' : '#9A8A7B' }}>
                {label}
              </button>
            ))}
          </nav>
        </section>
      </div>
    </main>
  )
}
