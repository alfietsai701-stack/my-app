import Image from 'next/image'
import Link from 'next/link'

// 總覽頁的畫面。資料由 page.tsx 查好傳進來，這裡只負責排版，
// 方便之後單獨調整樣式或用假資料預覽。

export type TodayAppt = {
  id: string
  time: string // HH:mm（台北時間）
  customerName: string
  serviceName: string
  durationMin: number
  status: string // confirmed | completed | cancelled
  past: boolean // 預約時間已過
}

export type DashboardData = {
  dateLabel: string // 例：11/17 週二
  today: TodayAppt[]
  revenueThis: number
  revenueLast: number
  apptCountThis: number
  categoryShare: { name: string; pct: number }[] // 本月營收占比，已排序，最多 4 項
  topServices: { name: string; count: number }[] // 本月最多人做的服務，最多 2 項
  week: { label: string; count: number; isToday: boolean; closed: boolean }[] // 週一到週日
  lowStock: { id: string; name: string; category: string; quantity: number; unit: string }[]
  lowStockCount: number
}

const SHARE_COLORS = ['var(--color-ink)', 'var(--color-sage-mid)', 'var(--color-sage-soft)', 'var(--color-line)']

function pctLabel(curr: number, prev: number) {
  if (prev === 0) return curr > 0 ? '本月開始累積' : '尚無資料'
  const p = Math.round(((curr - prev) / prev) * 100)
  if (p === 0) return '與上月持平'
  return p > 0 ? `較上月 +${p}%` : `較上月 ${p}%`
}

function conicGradient(share: { pct: number }[]) {
  if (share.length === 0) return 'var(--color-line-soft)'
  let acc = 0
  const stops = share.map((s, i) => {
    const from = acc
    acc += s.pct
    return `${SHARE_COLORS[i % SHARE_COLORS.length]} ${from}% ${Math.min(acc, 100)}%`
  })
  return `conic-gradient(${stops.join(', ')})`
}

export default function DashboardView({ data }: { data: DashboardData }) {
  const active = data.today.filter(a => a.status !== 'cancelled')
  const toSettle = data.today.filter(a => a.status === 'confirmed' && a.past)
  const upcoming = data.today.filter(a => a.status === 'confirmed' && !a.past)
  const done = data.today.filter(a => a.status === 'completed')
  const cancelled = data.today.filter(a => a.status === 'cancelled')
  const weekMax = Math.max(1, ...data.week.map(d => d.count))
  const weekTotal = data.week.reduce((s, d) => s + d.count, 0)
  const topMax = Math.max(1, ...data.topServices.map(s => s.count))

  return (
    <main className="flex-1 overflow-auto p-4 lg:p-5" style={{ background: 'var(--t-bg)' }}>
      {/* 手機版頁首：Logo＋日期 */}
      <div className="mb-3 flex items-center justify-between lg:hidden">
        <div className="flex items-center gap-1">
          <Image src="/logo.png" alt="Ada 慢療室" width={48} height={48} priority />
          <span className="font-heading text-[15px] font-semibold tracking-[0.25em] text-ink">慢療室</span>
        </div>
        <span className="text-[13px] text-ink-muted">{data.dateLabel}</span>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
        {/* ── 今日預約 ── */}
        <section className="rounded-2xl bg-surface px-5 py-[22px] lg:w-[340px] lg:shrink-0">
          <div className="flex items-baseline justify-between px-1 pb-2">
            <h1 className="text-[22px] text-ink">今日預約</h1>
            <span className="hidden text-xs text-ink-muted lg:inline">{data.dateLabel}</span>
          </div>
          <div className="flex items-baseline justify-between border-b border-line px-1 py-2.5">
            <span className="text-sm font-bold text-ink">共</span>
            <span className="num text-[22px] font-semibold text-ink">{active.length} <span className="font-sans text-sm font-normal">位</span></span>
          </div>

          {data.today.length === 0 && (
            <p className="px-1 py-8 text-center text-sm text-ink-muted">今天還沒有預約。</p>
          )}

          {toSettle.length > 0 && (
            <>
              <GroupHead label="待結帳" count={toSettle.length} />
              <div className="flex flex-col gap-1.5">
                {toSettle.map(a => (
                  <div key={a.id} className="flex items-center gap-2.5 rounded-lg bg-surface-muted px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink"><span className="num text-base">{a.time}</span>　{a.customerName}</p>
                      <p className="truncate text-xs text-ink-muted">{a.serviceName}・{a.durationMin} 分</p>
                    </div>
                    <Link href="/appointments"
                      className="flex h-11 shrink-0 items-center rounded-full bg-ink px-4 text-[13px] text-paper transition-colors hover:bg-ink-soft">
                      結帳
                    </Link>
                  </div>
                ))}
              </div>
            </>
          )}

          {upcoming.length > 0 && (
            <>
              <GroupHead label="接下來" count={upcoming.length} />
              {upcoming.map(a => <ApptRow key={a.id} appt={a} />)}
            </>
          )}

          {done.length > 0 && (
            <>
              <GroupHead label="已完成" count={done.length} />
              {done.map(a => <ApptRow key={a.id} appt={a} faint />)}
            </>
          )}

          {cancelled.length > 0 && (
            <>
              <GroupHead label="已取消" count={cancelled.length} />
              {cancelled.map(a => <ApptRow key={a.id} appt={a} faint strike />)}
            </>
          )}

          <Link href="/appointments"
            className="mt-3 flex h-11 items-center justify-center rounded-md bg-surface-muted text-[13px] font-medium text-ink transition-colors hover:bg-line-soft">
            打開日曆
          </Link>
        </section>

        <div className="flex min-w-0 flex-1 flex-col gap-4 lg:gap-5">
          {/* ── 本月營收 ── */}
          <section className="rounded-2xl bg-surface px-5 py-[22px] lg:px-[26px]">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[19px] text-ink lg:text-[22px]">本月營收</h2>
              <Link href="/reports" className="flex min-h-11 items-center text-[13px] text-ink underline underline-offset-4 hover:text-sage">看完整報表</Link>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-8 gap-y-5">
              {data.categoryShare.length > 0 && (
                <>
                  <div role="img"
                    aria-label={`營收占比：${data.categoryShare.map(s => `${s.name} ${s.pct}%`).join('、')}`}
                    className="flex size-[130px] shrink-0 items-center justify-center rounded-full lg:size-[150px]"
                    style={{ background: conicGradient(data.categoryShare) }}>
                    <span className="size-[64px] rounded-full bg-surface lg:size-[74px]" />
                  </div>
                  <ul className="flex flex-col gap-2 text-[13px] text-ink">
                    {data.categoryShare.map((s, i) => (
                      <li key={s.name} className="flex items-center gap-2.5">
                        <span aria-hidden="true" className="size-3 rounded-full" style={{ background: SHARE_COLORS[i % SHARE_COLORS.length] }} />
                        {s.name}　{s.pct}%
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <div className="flex flex-col gap-1">
                <span className="num text-[38px] font-medium leading-none text-ink lg:text-[44px]">
                  {data.revenueThis > 0 ? `NT$ ${data.revenueThis.toLocaleString()}` : '—'}
                </span>
                <span className="text-[13px] text-ink-muted">
                  {pctLabel(data.revenueThis, data.revenueLast)}　・　{data.apptCountThis} 筆預約
                </span>
              </div>
              {data.topServices.length > 0 && (
                <div className="flex min-w-[200px] flex-1 flex-col gap-2.5">
                  {data.topServices.map((s, i) => (
                    <div key={s.name} className="flex flex-col gap-2 rounded-lg border border-line px-3.5 py-3 text-[13px]">
                      <span className="flex justify-between gap-2 text-ink"><span className="truncate">{s.name}</span><span className="shrink-0 text-ink-muted">{s.count} 次</span></span>
                      <span className="flex h-2 rounded-full bg-line-soft">
                        <span className="rounded-full" style={{ width: `${Math.round((s.count / topMax) * 100)}%`, background: i === 0 ? 'var(--color-ink)' : 'var(--color-sage-mid)' }} />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <div className="flex flex-col gap-4 lg:flex-row lg:gap-5">
            {/* ── 本週預約數 ── */}
            <section className="flex flex-col gap-4 rounded-2xl bg-surface px-5 py-[22px] lg:flex-[1.3] lg:px-[26px]">
              <div className="flex items-baseline justify-between">
                <h2 className="text-[19px] text-ink">本週預約數</h2>
                <span className="text-xs text-ink-muted">共 {weekTotal} 筆</span>
              </div>
              <div role="img"
                aria-label={`本週每日預約數：${data.week.map(d => `${d.label} ${d.closed ? '公休' : d.count}`).join('、')}`}
                className="grid h-[170px] grid-cols-7 items-end gap-3 lg:h-[190px]">
                {data.week.map(d => (
                  <div key={d.label} className="flex h-full flex-col items-center gap-1.5">
                    {/* 長條區：高度依當週最大值等比 */}
                    <div className="flex w-full flex-1 flex-col items-center justify-end gap-1.5">
                      <span className={`text-xs ${d.isToday ? 'font-bold text-ink' : d.closed ? 'text-ink-faint' : 'text-ink'}`}>{d.closed ? '休' : d.count}</span>
                      <span className="w-full rounded-[8px]"
                        style={{
                          height: d.closed || d.count === 0 ? 3 : `calc((100% - 24px) * ${(d.count / weekMax).toFixed(3)})`,
                          minHeight: 3,
                          background: d.closed || d.count === 0 ? 'var(--color-line)' : d.isToday ? 'var(--color-ink)' : 'var(--color-sage-soft)',
                        }} />
                    </div>
                    <span className={`text-xs ${d.isToday ? 'font-bold text-ink' : 'text-ink-muted'}`}>{d.label}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* ── 低庫存提醒 ── */}
            <section className="flex flex-col gap-2.5 rounded-2xl bg-surface px-5 pb-4 pt-[22px] lg:flex-1">
              <div className="flex items-baseline justify-between">
                <h2 className="text-[19px] text-ink">低庫存提醒</h2>
                <span className="text-xs text-ink-muted">{data.lowStockCount} 項</span>
              </div>
              {data.lowStock.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-muted">庫存都充足。</p>
              ) : data.lowStock.map(item => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3.5 py-2.5 text-sm">
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-ink">{item.name}</span>
                    <span className="text-xs text-ink-muted">{item.category}</span>
                  </span>
                  <span className="shrink-0 font-bold text-ink">剩 {item.quantity} {item.unit}</span>
                </div>
              ))}
              <Link href="/inventory"
                className="mt-auto flex h-11 items-center justify-center rounded-md bg-surface-muted text-[13px] font-medium text-ink transition-colors hover:bg-line-soft">
                查看全部庫存
              </Link>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}

function GroupHead({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex justify-between px-1 pb-1 pt-4 text-[13px] font-bold text-ink">
      <span>{label}</span><span>{count}</span>
    </div>
  )
}

function ApptRow({ appt, faint, strike }: { appt: TodayAppt; faint?: boolean; strike?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-2.5 py-2 pl-3.5 pr-1 text-sm ${faint ? 'text-ink-faint' : 'text-ink'}`}>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className={`truncate ${strike ? 'line-through' : ''}`}>{appt.customerName}</span>
        <span className={`truncate text-xs ${faint ? '' : 'text-ink-muted'}`}>{appt.serviceName}</span>
      </span>
      <span className="num shrink-0 text-lg">{appt.time}</span>
    </div>
  )
}
