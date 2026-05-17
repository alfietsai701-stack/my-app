import {
  Activity,
  CalendarClock,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Gauge,
  Search,
  ShieldCheck,
  Sparkles,
  Syringe,
  UserRound,
  WalletCards,
} from 'lucide-react'

const navItems = [
  { icon: Gauge, label: '營運總覽', active: true },
  { icon: CalendarClock, label: '療程預約' },
  { icon: UserRound, label: '客戶檔案' },
  { icon: Syringe, label: '療程項目' },
  { icon: FileText, label: '諮詢紀錄' },
]

const stats = [
  { label: '今日諮詢', value: '18', sub: '6 位首次到診', color: '#2F7DD1' },
  { label: '待追蹤客戶', value: '32', sub: '本週需回訪', color: '#4CA6A8' },
  { label: '本月營收', value: 'NT$ 428K', sub: '較上月 +9.4%', color: '#7B8FA8' },
]

const appointments = [
  { time: '10:00', name: '吳小姐', service: '皮秒雷射諮詢', room: '診間 A', status: '已報到' },
  { time: '11:30', name: '陳小姐', service: '水光注射回診', room: '診間 B', status: '待報到' },
  { time: '14:00', name: '林先生', service: '音波拉提評估', room: '諮詢室', status: '已確認' },
  { time: '16:30', name: '張小姐', service: '術後照護追蹤', room: '診間 A', status: '待確認' },
]

const clients = [
  { name: '吳小姐', tag: '敏感肌', plan: '皮秒雷射', last: '5/16' },
  { name: '陳小姐', tag: '保濕修復', plan: '水光注射', last: '5/14' },
  { name: '林先生', tag: '拉提評估', plan: '音波拉提', last: '5/11' },
]

const treatments = ['皮秒雷射', '水光注射', '音波拉提']
const times = ['10:00', '11:30', '14:00', '15:30', '16:30', '18:00']

export default function MedicalPreviewPage() {
  return (
    <main className="min-h-screen bg-[#F4F7FA] text-[#1F2A37]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-4 py-6 sm:px-6 lg:px-8">
        <header className="overflow-hidden border border-[#D8E2EC] bg-white">
          <div className="grid gap-0 lg:grid-cols-[1fr_360px]">
            <div className="p-6 sm:p-8">
              <div className="mb-4 inline-flex items-center gap-2 border border-[#D8E2EC] bg-[#F7FAFC] px-3 py-1.5 text-[11px] font-semibold tracking-[0.22em] text-[#2F7DD1]">
                <ShieldCheck size={14} />
                MEDICAL AESTHETIC PREVIEW
              </div>
              <h1 className="text-3xl font-semibold tracking-normal text-[#1F2A37] sm:text-4xl">
                乾淨醫美科技風
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#667789]">
                以冰灰白、醫療藍、青綠輔色和墨藍文字建立專業、可信任的管理介面。畫面保留足夠資訊密度，但視覺更冷靜、精準。
              </p>
            </div>
            <div className="border-t border-[#D8E2EC] bg-[#102A43] p-6 text-white lg:border-l lg:border-t-0">
              <p className="text-[11px] font-semibold tracking-[0.22em] text-[#9BC7F2]">PALETTE</p>
              <div className="mt-5 grid grid-cols-5 gap-2">
                {['#F4F7FA', '#FFFFFF', '#2F7DD1', '#4CA6A8', '#102A43'].map(color => (
                  <div key={color} className="h-12 border border-white/20" style={{ background: color }} />
                ))}
              </div>
              <p className="mt-5 text-sm leading-6 text-[#D6E6F7]">
                適合醫美、皮膚管理、診所型品牌；比沙龍版更專業、更有科技感。
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-[272px_1fr]">
          <aside className="border border-[#D8E2EC] bg-white p-4">
            <div className="mb-7 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center bg-[#2F7DD1] text-white">
                <Activity size={19} />
              </div>
              <div>
                <p className="text-sm font-semibold">醫美管理後台</p>
                <p className="text-xs text-[#7B8FA8]">Clinic OS</p>
              </div>
            </div>
            <nav className="space-y-1">
              {navItems.map(({ icon: Icon, label, active }) => (
                <div
                  key={label}
                  className="flex h-11 items-center gap-3 px-3 text-sm font-medium"
                  style={{
                    background: active ? '#E8F2FE' : 'transparent',
                    borderLeft: active ? '3px solid #2F7DD1' : '3px solid transparent',
                    color: active ? '#1E5E9F' : '#667789',
                  }}
                >
                  <Icon size={17} />
                  {label}
                </div>
              ))}
            </nav>
            <div className="mt-8 border-t border-[#E4ECF3] pt-4">
              <div className="bg-[#F7FAFC] px-3 py-3">
                <p className="text-xs font-semibold text-[#1F2A37]">今日診間使用率</p>
                <div className="mt-3 h-2 bg-[#E4ECF3]">
                  <div className="h-2 bg-[#4CA6A8]" style={{ width: '72%' }} />
                </div>
                <p className="mt-2 text-[11px] text-[#7B8FA8]">72% booked</p>
              </div>
            </div>
          </aside>

          <div className="space-y-6">
            <section className="border border-[#D8E2EC] bg-white">
              <div className="flex flex-col gap-4 border-b border-[#E4ECF3] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.24em] text-[#7B8FA8]">CLINIC DASHBOARD</p>
                  <h2 className="mt-1 text-xl font-semibold">今日營運狀態</h2>
                </div>
                <div className="flex h-10 items-center gap-2 border border-[#D8E2EC] bg-[#F7FAFC] px-3 text-sm text-[#667789]">
                  <Search size={15} />
                  <span>搜尋客戶、療程或諮詢紀錄</span>
                </div>
              </div>
              <div className="grid gap-4 p-5 lg:grid-cols-3">
                {stats.map(stat => (
                  <div key={stat.label} className="border border-[#E4ECF3] bg-[#F7FAFC] p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-[#667789]">{stat.label}</p>
                      <span className="block size-2.5 rounded-full" style={{ background: stat.color }} />
                    </div>
                    <p className="mt-5 text-2xl font-semibold text-[#1F2A37]">{stat.value}</p>
                    <p className="mt-1 text-xs text-[#7B8FA8]">{stat.sub}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="border border-[#D8E2EC] bg-white">
                <div className="flex items-center justify-between border-b border-[#E4ECF3] px-5 py-4">
                  <h2 className="text-sm font-semibold">今日療程排程</h2>
                  <button className="flex items-center gap-1 text-xs font-semibold text-[#2F7DD1]">
                    排程表 <ChevronRight size={14} />
                  </button>
                </div>
                <div className="divide-y divide-[#E4ECF3]">
                  {appointments.map(item => (
                    <div key={`${item.time}-${item.name}`} className="grid grid-cols-[64px_1fr_auto] items-center gap-4 px-5 py-4">
                      <div className="text-sm font-semibold tabular-nums text-[#2F7DD1]">{item.time}</div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{item.name}</p>
                        <p className="truncate text-xs text-[#667789]">{item.service} · {item.room}</p>
                      </div>
                      <span className="border border-[#D8E2EC] bg-[#F7FAFC] px-2.5 py-1 text-[11px] text-[#667789]">
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-[#D8E2EC] bg-white">
                <div className="border-b border-[#E4ECF3] px-5 py-4">
                  <h2 className="text-sm font-semibold">療程客戶</h2>
                </div>
                <div className="divide-y divide-[#E4ECF3]">
                  {clients.map(client => (
                    <div key={client.name} className="px-5 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold">{client.name}</p>
                        <span className="bg-[#E9F6F6] px-2 py-1 text-[11px] text-[#317C7E]">{client.tag}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-[#667789]">
                        <span>{client.plan}</span>
                        <span>{client.last}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="border border-[#D8E2EC] bg-white p-5">
            <p className="text-[11px] font-semibold tracking-[0.24em] text-[#7B8FA8]">PUBLIC BOOKING</p>
            <h2 className="mt-1 text-xl font-semibold">顧客端預約樣式</h2>
            <div className="mt-5 border border-[#E4ECF3] bg-[#F7FAFC] p-4">
              <p className="mb-3 text-sm font-semibold">選擇療程類別</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {treatments.map((treatment, index) => (
                  <button
                    key={treatment}
                    className="border px-3 py-3 text-left text-sm font-semibold"
                    style={{
                      borderColor: index === 0 ? '#2F7DD1' : '#D8E2EC',
                      background: index === 0 ? '#E8F2FE' : '#FFFFFF',
                      color: index === 0 ? '#1E5E9F' : '#667789',
                    }}
                  >
                    {treatment}
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
                      borderColor: index === 2 ? '#2F7DD1' : '#D8E2EC',
                      background: index === 2 ? '#2F7DD1' : '#FFFFFF',
                      color: index === 2 ? '#FFFFFF' : '#1F2A37',
                    }}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="border border-[#D8E2EC] bg-[#102A43] p-5 text-white">
            <p className="text-[11px] font-semibold tracking-[0.24em] text-[#9BC7F2]">DESIGN TOKENS</p>
            <h2 className="mt-1 text-xl font-semibold">醫美版建議 token</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ['背景', '#F4F7FA'],
                ['表面', '#FFFFFF'],
                ['主色', '#2F7DD1'],
                ['輔色', '#4CA6A8'],
                ['文字', '#1F2A37'],
                ['邊線', '#D8E2EC'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between border border-white/10 bg-white/5 px-4 py-3">
                  <span className="text-sm text-[#D6E6F7]">{label}</span>
                  <span className="font-mono text-xs text-[#9BC7F2]">{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="border border-white/10 bg-white/5 p-4">
                <ClipboardCheck className="mb-3 text-[#9BC7F2]" size={20} />
                <p className="text-sm font-semibold">更專業可信</p>
                <p className="mt-2 text-xs leading-5 text-[#BFD7EF]">適合療程紀錄、術後追蹤、諮詢流程與診間排程。</p>
              </div>
              <div className="border border-white/10 bg-white/5 p-4">
                <WalletCards className="mb-3 text-[#9BC7F2]" size={20} />
                <p className="text-sm font-semibold">更偏管理系統</p>
                <p className="mt-2 text-xs leading-5 text-[#BFD7EF]">視覺冷靜、清楚，長時間看報表和名單比較不疲勞。</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
