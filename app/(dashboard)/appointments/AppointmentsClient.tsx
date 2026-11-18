'use client'

import { useEffect, useState, useCallback, useSyncExternalStore } from 'react'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'

type Customer = { id: string; name: string; phone: string }
type Service  = { id: string; name: string; durationMin: number; price: number }
type Appt = {
  id: string; scheduledAt: string; status: string; note: string | null
  customer: Customer; service: Service
  receipt: { total: number; payMethod: string } | null
}

// 預約狀態色（對應設計系統：已確認＝status-confirmed、已完成＝status-done）
const STATUS = {
  confirmed: { label: '已確認', color: '#26332A', bg: '#B9C9B5', border: '#B9C9B5' },
  completed: { label: '已完成', color: '#4A4A45', bg: '#DCDCD5', border: '#DCDCD5' },
  cancelled:  { label: '已取消', color: '#5C5C56', bg: '#F4F4EF', border: '#D3D3CB' },
}
// 側欄／手機底部的「建立新預約」已在本頁時，用這個事件直接打開新增視窗
const NEW_APPT_EVENT = 'ada:new-appointment'
const PAY_METHODS = ['現金', '信用卡', 'Line Pay', '轉帳']
const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']
// 預約結束後的緩衝時間：不顯示在畫面上，只用來決定空格能不能直接點「＋」新增
const BUFFER_MIN = 60
// 時間軸每小時的高度（px）
const HOUR_H = { week: 64, day: 72 } as const

// 手機預設看「日」（週曆在窄螢幕太擠），電腦預設看「週」
const MOBILE_QUERY = '(max-width: 1023px)'
function subscribeMobile(cb: () => void) {
  const mq = window.matchMedia(MOBILE_QUERY)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

// ── helpers ──────────────────────────────────────────────────────────────────

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function toMonthStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
}
function getMonday(d: Date) {
  const day = d.getDay()
  const m = new Date(d); m.setHours(0,0,0,0); m.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return m
}
function getWeekDays(monday: Date) {
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate()+i); return d })
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
}
function minOfDay(d: Date) { return d.getHours()*60 + d.getMinutes() }
function toMin(hhmm: string) { const [h, m] = hhmm.split(':').map(Number); return h*60 + m }
/** 分鐘數 → 「上午10:30」「下午1:30」 */
function fmtClock(min: number) {
  const h = Math.floor(min/60) % 24, m = min % 60
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h < 12 ? '上午' : '下午'}${h12}:${String(m).padStart(2,'0')}`
}

type Placed = { a: Appt; start: number; end: number; lane: number; lanes: number }
/** 依實際起訖時間排版；時間重疊的預約並排顯示 */
function layoutDay(appts: Appt[]): Placed[] {
  const items: Placed[] = appts
    .map(a => { const s = minOfDay(new Date(a.scheduledAt)); return { a, start: s, end: s + a.service.durationMin, lane: 0, lanes: 1 } })
    .sort((x, y) => x.start - y.start || y.end - x.end)
  let cluster: Placed[] = []
  let clusterEnd = -1
  const laneEnds: number[] = []
  const flush = () => { const n = Math.max(...cluster.map(p => p.lane + 1)); cluster.forEach(p => { p.lanes = n }) }
  for (const p of items) {
    if (cluster.length && p.start >= clusterEnd) { flush(); cluster = []; laneEnds.length = 0 }
    let lane = laneEnds.findIndex(e => e <= p.start)
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(p.end) } else laneEnds[lane] = p.end
    p.lane = lane
    cluster.push(p)
    clusterEnd = Math.max(clusterEnd, p.end)
  }
  if (cluster.length) flush()
  return items
}
function groupByDate(appts: Appt[]): Record<string, Appt[]> {
  const map: Record<string, Appt[]> = {}
  for (const a of appts) { const ds = toDateStr(new Date(a.scheduledAt)); (map[ds] ??= []).push(a) }
  return map
}
function buildCalendar(year: number, month: number): Date[] {
  const first = new Date(year, month, 1), last = new Date(year, month+1, 0)
  const days: Date[] = []
  for (let i = 0; i < first.getDay(); i++) days.push(new Date(year, month, -first.getDay()+i+1))
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d))
  const rem = 7 - (days.length % 7); if (rem < 7) for (let d = 1; d <= rem; d++) days.push(new Date(year, month+1, d))
  return days
}

// ── component ─────────────────────────────────────────────────────────────────

export default function AppointmentsClient({
  initialMonthData,
  initialServices,
  initialSlots,
}: {
  initialMonthData: Record<string, Appt[]>
  initialServices: Service[]
  initialSlots: string[]
}) {
  const today = toDateStr(new Date())

  const [viewPref, setView]       = useState<'month'|'week'|'day'|null>(null)
  const isMobile = useSyncExternalStore(subscribeMobile, () => window.matchMedia(MOBILE_QUERY).matches, () => false)
  const view = viewPref ?? (isMobile ? 'day' : 'week')
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [date, setDate]           = useState(today)
  const [month, setMonth]         = useState(toMonthStr(new Date()))

  const [monthData, setMonthData] = useState<Record<string, Appt[]>>(initialMonthData)
  const [slots, setSlots]         = useState<string[]>(initialSlots)
  const [selected, setSelected]   = useState<Appt|null>(null)

  const [adding, setAdding]         = useState(false)
  const [addingBlock, setAddingBlock] = useState(false)
  const [paying, setPaying]         = useState(false)
  const [blocks, setBlocks]         = useState<Array<{id:string;date:string;start:string;end:string;note?:string}>>([])
  const [customers, setCustomers]   = useState<Customer[]>([])
  const [services, setServices]     = useState<Service[]>(initialServices)
  const [custQ, setCustQ]           = useState('')
  const [form, setForm]             = useState({ customerId:'', serviceId:'', date:'', time:'', note:'' })
  const [payForm, setPayForm]       = useState({ total:'', payMethod: PAY_METHODS[0] })
  const [saving, setSaving]         = useState(false)
  const [newCust, setNewCust]       = useState({ name:'', phone:'' })
  const [creatingCust, setCreatingCust] = useState(false)

  // ── data fetching ──

  const fetchMonth = useCallback(async (m: string) => {
    const res = await fetch(`/api/appointments?month=${m}`)
    if (!res.ok) return
    const data: Appt[] = await res.json()
    setMonthData(prev => ({ ...prev, [m]: data }))
  }, [])

  const fetchBlocks = useCallback(async (m: string) => {
    const res = await fetch(`/api/settings/blocks?month=${m}`)
    if (!res.ok) return
    const data = await res.json()
    setBlocks(prev => {
      const merged = [...prev.filter(b => !b.date.startsWith(m)), ...data]
      return merged
    })
  }, [])

  const loadMonth = useCallback((m: string) => {
    setMonthData(prev => { if (prev[m]) return prev; fetchMonth(m); return prev })
  }, [fetchMonth])

  const reload = useCallback(async () => {
    const months = view === 'week'
      ? [...new Set(getWeekDays(weekStart).map(d => toMonthStr(d)))]
      : view === 'month' ? [month]
      : [toMonthStr(new Date(date + 'T00:00:00'))]
    await Promise.all(months.map(async m => { await fetchMonth(m); await fetchBlocks(m) }))
  }, [view, weekStart, month, date, fetchMonth])

  useEffect(() => {
    if (view === 'week') getWeekDays(weekStart).map(d => toMonthStr(d)).forEach(m => { loadMonth(m); fetchBlocks(m) })
    else if (view === 'month') { loadMonth(month); fetchBlocks(month) }
    else { const m = toMonthStr(new Date(date + 'T00:00:00')); loadMonth(m); fetchBlocks(m) }
  }, [view, weekStart, month, date, loadMonth])

  useEffect(() => {
    const t = setTimeout(async () => {
      const res = await fetch(`/api/customers?q=${encodeURIComponent(custQ)}`)
      if (res.ok) setCustomers(await res.json())
    }, 250)
    return () => clearTimeout(t)
  }, [custQ])

  // ── derived ──

  const allAppts   = Object.values(monthData).flat()
  const byDate     = groupByDate(allAppts)
  const weekDays   = getWeekDays(weekStart)
  const [calYear, calMonth] = month.split('-').map(Number)

  const weekEnd    = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6)
  const weekLabel  = weekStart.getMonth() === weekEnd.getMonth()
    ? `${weekStart.getMonth()+1} 月 ${weekStart.getDate()}–${weekEnd.getDate()} 日`
    : `${weekStart.getMonth()+1}/${weekStart.getDate()} – ${weekEnd.getMonth()+1}/${weekEnd.getDate()}`

  // ── actions ──

  function openAdd(preDate?: string, preSlot?: string) {
    setForm({ customerId:'', serviceId: services[0]?.id??'', date: preDate??(view==='day'?date:today), time: preSlot??slots[0]??'11:00', note:'' })
    setCustQ(''); setCreatingCust(false); setNewCust({ name:'', phone:'' }); setAdding(true)
  }

  function openAddBlock(preDate?: string, preStart?: string) {
    setBlockForm({ date: preDate??today, start: preStart??slots[0]??'11:00', end: slots[0]??'12:00', note: '' })
    setAddingBlock(true)
  }

  async function handleCreateCustomer() {
    if (!newCust.name || !newCust.phone) return
    setSaving(true)
    const res = await fetch('/api/customers', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name: newCust.name, phone: newCust.phone }) })
    if (res.ok) { const c = await res.json(); setForm(f => ({...f, customerId: c.id})); setCustomers(p => [c,...p]); setCreatingCust(false) }
    setSaving(false)
  }

  async function handleAdd() {
    if (!form.customerId||!form.serviceId||!form.date||!form.time) return
    setSaving(true)
    await fetch('/api/appointments', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ customerId: form.customerId, serviceId: form.serviceId, scheduledAt: new Date(`${form.date}T${form.time}:00`).toISOString(), note: form.note }) })
    setSaving(false); setAdding(false); await reload()
  }

  async function handleStatus(id: string, status: string) {
    await fetch(`/api/appointments/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status }) })
    setSelected(prev => prev?.id===id ? {...prev, status} : prev)
    await reload()
  }

  async function handlePay() {
    if (!selected) return
    setSaving(true)
    await fetch(`/api/appointments/${selected.id}`, { method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ status:'completed', total: Number(payForm.total), payMethod: payForm.payMethod }) })
    setSaving(false); setPaying(false); setSelected(null); await reload()
  }

  async function handleDelete(id: string) {
    if (!confirm('確定要刪除這筆預約？')) return
    await fetch(`/api/appointments/${id}`, { method:'DELETE' })
    setSelected(null); await reload()
  }

  async function handleDeleteBlock(id: string) {
    if (!confirm('確定要刪除這個休假？')) return
    await fetch(`/api/settings/blocks?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    await reload()
  }

  const selectedCustomer = customers.find(c => c.id === form.customerId)

  // 「建立新預約」捷徑：已在本頁時收事件；從別頁帶 ?new=1 進來時，載入後打開新增視窗
  useEffect(() => {
    const open = () => openAdd()
    window.addEventListener(NEW_APPT_EVENT, open)
    return () => window.removeEventListener(NEW_APPT_EVENT, open)
  })
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('new') !== '1') return
    const t = setTimeout(() => {
      window.history.replaceState(null, '', window.location.pathname)
      openAdd()
    }, 0)
    return () => clearTimeout(t)
    // 只在進頁面時檢查一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // block form
  const [blockForm, setBlockForm] = useState({ date: today, start: slots[0]??'11:00', end: slots[0]??'12:00', note: '' })
  const [creatingBlock, setCreatingBlock] = useState(false)

  async function handleCreateBlock() {
    if (!blockForm.date || !blockForm.start || !blockForm.end) return
    setCreatingBlock(true)
    const res = await fetch('/api/settings/blocks', { method:'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(blockForm) })
    setCreatingBlock(false)
    setAddingBlock(false)
    await reload()
  }

  // ── 時間軸（週／日共用）──────────────────────────────────────────────────────
  // 預約依「開始時間 + 服務時長」畫成一整塊；緩衝時間不顯示。

  const gridDays = view === 'week' ? weekDays.map(toDateStr) : [date]
  const { gridStart, gridEnd } = (() => {
    const slotMins = slots.map(toMin)
    let lo = slotMins.length ? Math.min(...slotMins) : 11*60
    let hi = slotMins.length ? Math.max(...slotMins) + 60 : 20*60
    for (const ds of gridDays) {
      for (const a of byDate[ds] ?? []) {
        const s = minOfDay(new Date(a.scheduledAt))
        lo = Math.min(lo, s); hi = Math.max(hi, s + a.service.durationMin)
      }
      for (const b of blocks) if (b.date === ds) { lo = Math.min(lo, toMin(b.start)); hi = Math.max(hi, toMin(b.end)) }
    }
    return { gridStart: Math.floor(lo/60)*60, gridEnd: Math.min(24*60, Math.ceil(hi/60)*60) }
  })()
  const gridHours = Array.from({ length: (gridEnd - gridStart)/60 }, (_, i) => gridStart/60 + i)

  /** 這個時段能不能直接點「＋」新增：沒有預約（含結束後緩衝）也沒有休假 */
  function isSlotFree(ds: string, slot: string) {
    const m = toMin(slot)
    for (const a of byDate[ds] ?? []) {
      if (a.status === 'cancelled') continue
      const s = minOfDay(new Date(a.scheduledAt))
      if (m >= s && m < s + a.service.durationMin + BUFFER_MIN) return false
    }
    for (const b of blocks) if (b.date === ds && m >= toMin(b.start) && m < toMin(b.end)) return false
    return true
  }

  function renderTimeGrid(days: string[], mode: 'week' | 'day') {
    const hourH = HOUR_H[mode]
    const px = (min: number) => ((min - gridStart) / 60) * hourH
    const line = { borderColor: 'var(--color-line-soft)' }
    const sortedSlots = [...slots].sort((x, y) => toMin(x) - toMin(y))
    return (
      <div className="grid" style={{ gridTemplateColumns: `${mode === 'week' ? 56 : 64}px repeat(${days.length},minmax(0,1fr))` }}>
        {/* 時間刻度 */}
        <div className="border-r" style={line}>
          {gridHours.map(h => (
            <div key={h} className="flex justify-center pt-2 border-b last:border-b-0" style={{ ...line, height: hourH }}>
              <span className="num text-[15px]" style={{ color: 'var(--t-text-3)' }}>{String(h).padStart(2, '0')}:00</span>
            </div>
          ))}
        </div>

        {days.map(ds => (
          <div key={ds} className="relative border-r last:border-r-0"
            style={{ ...line, height: gridHours.length * hourH, background: mode === 'week' && ds === today ? '#F7F7F3' : '' }}>
            {/* 每小時格線 */}
            {gridHours.map(h => <div key={h} className="border-b last:border-b-0" style={{ ...line, height: hourH }} />)}

            {/* 空時段：滑過出現「＋」 */}
            {sortedSlots.map((s, i) => {
              if (!isSlotFree(ds, s)) return null
              const start = toMin(s)
              const next = sortedSlots[i + 1] ? toMin(sortedSlots[i + 1]) : start + 60
              return (
                <button key={s} onClick={() => openAdd(ds, s)} aria-label={`新增 ${s} 預約`}
                  className={`absolute left-1 right-1 flex items-center justify-center gap-1 opacity-0 hover:opacity-100 focus-visible:opacity-100 transition-opacity ${mode === 'week' ? 'rounded-md' : 'rounded-xl'}`}
                  style={{ top: px(start) + 2, height: (Math.min(next - start, 60) / 60) * hourH - 4,
                    border: '1.5px dashed #8A8A82', background: '#F4F4EF', color: 'var(--t-text-4)' }}>
                  <Plus size={13} strokeWidth={2.5} style={{ color: 'var(--t-accent)' }} />
                  {mode === 'day' && <span className="text-xs">新增</span>}
                </button>
              )
            })}

            {/* 休假（手動封鎖的時段） */}
            {blocks.filter(b => b.date === ds).map(b => {
              const start = toMin(b.start), end = toMin(b.end)
              return (
                <button key={b.id} onClick={() => handleDeleteBlock(b.id)} title="點一下可刪除這個休假"
                  className="absolute left-1 right-1 overflow-hidden rounded-lg px-2 py-1 text-left"
                  style={{ top: px(start) + 1, height: Math.max(((end - start) / 60) * hourH - 2, 22),
                    background: 'repeating-linear-gradient(135deg, #F4F4EF 0 6px, #ECECE6 6px 12px)', color: 'var(--t-text-3)' }}>
                  <p className="text-[11px] font-semibold leading-tight">休假</p>
                  <p className="text-[10px] leading-tight opacity-80">{fmtClock(start)} - {fmtClock(end)}{b.note ? `・${b.note}` : ''}</p>
                </button>
              )
            })}

            {/* 預約：依服務時長畫成一整塊 */}
            {layoutDay(byDate[ds] ?? []).map(({ a, start, end, lane, lanes }) => {
              const cfg = STATUS[a.status as keyof typeof STATUS] ?? STATUS.confirmed
              const isSel = selected?.id === a.id
              const h = Math.max(((end - start) / 60) * hourH - 3, 26)
              return (
                <div key={a.id} onClick={() => setSelected(isSel ? null : a)}
                  className={`absolute z-[1] cursor-pointer overflow-hidden transition-colors ${mode === 'week' ? 'rounded-lg px-2 py-1' : 'rounded-xl px-3.5 py-2'}`}
                  style={{
                    top: px(start) + 1.5, height: h,
                    left: `calc(${(lane / lanes) * 100}% + 3px)`, width: `calc(${100 / lanes}% - 6px)`,
                    background: isSel ? cfg.color : cfg.bg,
                    color: isSel ? '#fff' : cfg.color,
                    opacity: a.status === 'cancelled' ? 0.55 : 1,
                  }}>
                  {mode === 'week' ? (
                    <>
                      <p className="truncate leading-tight opacity-80 text-[10px]">{fmtClock(start)} - {fmtClock(end)}</p>
                      <p className="truncate leading-tight font-semibold text-xs mt-0.5">{a.customer.name}</p>
                      <p className="truncate leading-tight opacity-75 text-[11px]">{a.service.name}</p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs opacity-80">{fmtClock(start)} - {fmtClock(end)}</p>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0"
                          style={{ background: isSel ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)' }}>{cfg.label}</span>
                      </div>
                      <p className="truncate text-sm font-semibold mt-0.5">{a.customer.name}　{a.service.name}</p>
                      <p className="truncate text-xs opacity-70 mt-0.5">{a.service.durationMin} 分鐘・NT$ {a.service.price.toLocaleString()}</p>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    )
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      {/* ── header ── */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 lg:px-5 py-3"
        style={{ background:'var(--t-bg)' }}>

        <div className="flex items-center gap-1.5 min-w-0">
          {/* View tabs */}
          <div role="tablist" aria-label="檢視方式" className="flex rounded-full p-1 mr-1" style={{ background:'var(--t-surface)' }}>
            {(['day','week','month'] as const).map(v => (
              <button key={v} role="tab" aria-selected={view===v} onClick={() => setView(v)}
                className="h-10 min-w-11 px-3.5 rounded-full text-[13px] transition-colors"
                style={view===v
                  ? { background:'var(--t-accent)', color:'var(--t-accent-fg)', fontWeight:500 }
                  : { color:'var(--t-text)' }}>
                {v==='month'?'月':v==='week'?'週':'日'}
              </button>
            ))}
          </div>

          {/* Nav arrows */}
          {(['prev','label','next'] as const).map(part => {
            if (part === 'label') return (
              <button key="label" onClick={() => { const n=new Date(); setWeekStart(getMonday(n)); setDate(toDateStr(n)); setMonth(toMonthStr(n)) }}
                title="回到今天"
                className="font-heading text-base lg:text-xl font-semibold min-w-[104px] lg:min-w-[150px] text-center truncate tracking-wide"
                style={{ color:'var(--t-text)' }}>
                {view==='week' ? weekLabel : view==='month'
                  ? `${calYear} 年 ${calMonth} 月`
                  : new Date(date+'T00:00:00').toLocaleDateString('zh-TW',{month:'long',day:'numeric',weekday:'short'})}
              </button>
            )
            const dir = part==='prev' ? -1 : 1
            function shift() {
              if (view==='week') setWeekStart(w => { const d=new Date(w); d.setDate(d.getDate()+dir*7); return d })
              else if (view==='month') { const [y,m]=month.split('-').map(Number); setMonth(toMonthStr(new Date(y,m-1+dir,1))) }
              else { const d=new Date(date+'T00:00:00'); d.setDate(d.getDate()+dir); setDate(toDateStr(d)) }
            }
            return (
              <button key={part} onClick={shift} aria-label={part==='prev' ? '往前' : '往後'}
                className="size-11 flex items-center justify-center rounded-full shrink-0 transition-colors hover:bg-[var(--t-elevated)]"
                style={{ color:'var(--t-text)', background:'var(--t-surface)' }}>
                {part==='prev' ? <ChevronLeft size={16} strokeWidth={2}/> : <ChevronRight size={16} strokeWidth={2}/>}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button onClick={() => openAddBlock()}
            className="h-11 flex items-center px-4 rounded-full text-[13px] shrink-0 transition-colors hover:bg-[var(--t-elevated)]"
            style={{ background:'var(--t-surface)', color:'var(--t-text)' }}>
            新增休假
          </button>
          {/* 手機版由底部選單的 ＋ 建立預約，這顆只在電腦版出現 */}
          <button onClick={() => openAdd()}
            className="hidden lg:flex h-11 items-center gap-1.5 px-5 rounded-full text-sm font-medium shrink-0 transition-colors"
            style={{ background:'var(--t-accent)', color:'var(--t-accent-fg)' }}>
            <Plus size={15} strokeWidth={2}/>新增預約
          </button>
        </div>
      </div>

      {/* ── body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ══ WEEK VIEW ══ */}
        {view==='week' && (
          <div className={`flex flex-col flex-1 overflow-hidden px-4 lg:px-5 pb-3 lg:pb-5 ${selected ? 'hidden lg:flex' : ''}`}
            style={{ background:'var(--t-bg)' }}>
            <div className="flex-1 overflow-auto rounded-2xl" style={{ background:'var(--t-surface)' }}>
              <div className="min-w-[580px]">

                {/* Day header row */}
                <div className="sticky top-0 z-10 grid border-b"
                  style={{ gridTemplateColumns:'56px repeat(7,minmax(0,1fr))', background:'var(--t-surface)', borderColor:'var(--color-line-soft)' }}>
                  <div className="border-r" style={{ borderColor:'var(--color-line-soft)' }}/>
                  {weekDays.map(day => {
                    const ds = toDateStr(day)
                    const isToday = ds===today
                    const cnt = (byDate[ds]??[]).filter(a=>a.status!=='cancelled').length
                    return (
                      <div key={ds} className="flex flex-col items-center py-2.5 border-r last:border-r-0"
                        style={{ borderColor:'var(--color-line-soft)', background: isToday?'#F7F7F3':'' }}>
                        <span className="text-[11px] mb-1" style={{ color: day.getDay()===0?'var(--t-danger)':'var(--t-text-4)' }}>
                          {WEEKDAY_LABELS[day.getDay()]}
                        </span>
                        <span className="w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold"
                          style={isToday
                            ? { background:'var(--t-accent)', color:'var(--t-accent-fg)' }
                            : { color: day.getDay()===0?'var(--t-danger)':'var(--t-text)' }}>
                          {day.getDate()}
                        </span>
                        {cnt > 0 && (
                          <span className="mt-1 text-[10px] font-medium px-1.5 rounded-full"
                            style={{ background:'var(--t-accent-bg)', color:'var(--t-accent)' }}>{cnt}</span>
                        )}
                      </div>
                    )
                  })}
                </div>

                {renderTimeGrid(gridDays, 'week')}
              </div>
            </div>
          </div>
        )}

        {/* ══ DAY VIEW ══ */}
        {view==='day' && (
          <div className={`flex flex-col flex-1 overflow-hidden px-4 lg:px-5 pb-3 lg:pb-5 ${selected ? 'hidden lg:flex' : ''}`}
            style={{ background:'var(--t-bg)' }}>
            <div className="flex-1 overflow-auto rounded-2xl" style={{ background:'var(--t-surface)' }}>
              {renderTimeGrid(gridDays, 'day')}
              <div className="px-5 py-3 text-xs border-t" style={{ color:'var(--t-text-4)', borderColor:'var(--color-line-soft)' }}>
                共 {(byDate[date]??[]).filter(a=>a.status!=='cancelled').length} 筆有效預約
              </div>
            </div>
          </div>
        )}
        {/* ══ MONTH VIEW ══ */}
        {view==='month' && (
          <div className={`flex-1 overflow-auto ${selected?'hidden lg:block':''}`} style={{ background:'var(--t-bg)' }}>
            <div className="p-4 lg:p-6">
              <div className="grid grid-cols-7 mb-1">
                {WEEKDAY_LABELS.map((w,i) => (
                  <div key={w} className="text-center py-1.5 text-xs font-medium"
                    style={{ color: i===0?'var(--t-danger)':'var(--t-text-4)' }}>{w}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {buildCalendar(calYear, calMonth-1).map((d, i) => {
                  const ds = toDateStr(d), isThisMonth = d.getMonth()===calMonth-1
                  const isToday = ds===today, cellAppts = byDate[ds]??[]
                  const activeCount = cellAppts.filter(a=>a.status!=='cancelled').length
                  return (
                    <div key={i} onClick={() => { setDate(ds); setView('day') }}
                      className="rounded-xl p-2 cursor-pointer transition-all hover:scale-[1.015]"
                      style={{ background:'var(--t-surface)', boxShadow:'var(--t-shadow)', minHeight:80, opacity: isThisMonth?1:0.3,
                        border: ds===date?'1.5px solid #1C1C1A':'1.5px solid transparent' }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold"
                          style={isToday?{ background:'var(--t-accent)', color:'var(--t-accent-fg)' }:{ color: d.getDay()===0?'var(--t-danger)':'var(--t-text-3)' }}>
                          {d.getDate()}
                        </span>
                        {activeCount>0 && (
                          <span className="text-[9px] font-semibold px-1 rounded-full"
                            style={{ background:'var(--t-accent-bg)', color:'var(--t-accent)' }}>{activeCount}</span>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        {cellAppts.slice(0,2).map(a => {
                          const cfg = STATUS[a.status as keyof typeof STATUS]??STATUS.confirmed
                          return (
                            <div key={a.id} className="flex items-center gap-1 overflow-hidden">
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background:cfg.color }}/>
                              <span className="text-[10px] truncate" style={{ color:'var(--t-text-3)' }}>
                                {fmtTime(a.scheduledAt)} {a.customer.name}
                              </span>
                            </div>
                          )
                        })}
                        {cellAppts.length>2 && <p className="text-[9px] pl-2.5" style={{ color:'var(--t-text-4)' }}>+{cellAppts.length-2}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══ DETAIL PANEL ══ */}
        {selected && (
          <div className="flex-1 lg:w-80 lg:flex-none flex flex-col overflow-hidden"
            style={{ background:'var(--t-bg)', borderLeft:'1px solid var(--t-border)' }}>
            <div className="px-5 py-4 shrink-0 flex items-start justify-between"
              style={{ background:'var(--t-surface)', borderBottom:'1px solid var(--t-border)' }}>
              <div>
                <p className="text-base font-bold" style={{ color:'var(--t-text)' }}>{selected.customer.name}</p>
                <p className="text-sm mt-0.5" style={{ color:'var(--t-text-4)' }}>{selected.customer.phone}</p>
                {(() => {
                  const cfg = STATUS[selected.status as keyof typeof STATUS]??STATUS.confirmed
                  return <span className="inline-flex mt-2 text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                    style={{ background:cfg.bg, color:cfg.color, border:`1.5px solid ${cfg.border}` }}>{cfg.label}</span>
                })()}
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg"
                style={{ color:'var(--t-text-4)' }}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='var(--t-elevated)'}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=''}>
                <X size={16} strokeWidth={2}/>
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-3">
              <div className="rounded-2xl p-4 space-y-3" style={{ background:'var(--t-surface)', boxShadow:'var(--t-shadow)' }}>
                {[
                  ['服務項目', selected.service.name],
                  ['預約時間', `${new Date(selected.scheduledAt).toLocaleDateString('zh-TW',{month:'numeric',day:'numeric'})} ${fmtTime(selected.scheduledAt)}`],
                  ['服務時長', `${selected.service.durationMin} 分鐘`],
                  ['服務金額', `NT$ ${selected.service.price.toLocaleString()}`],
                  ...(selected.note ? [['備註', selected.note]] : []),
                ].map(([label, value]) => (
                  <div key={label} className="flex gap-3">
                    <p className="text-xs font-medium w-16 shrink-0 mt-0.5" style={{ color:'var(--t-text-4)' }}>{label}</p>
                    <p className="text-sm flex-1" style={{ color:'var(--t-text-2)' }}>{value}</p>
                  </div>
                ))}
                {selected.receipt && (
                  <div className="flex gap-3 pt-3" style={{ borderTop:'1px solid var(--t-border)' }}>
                    <p className="text-xs font-medium w-16 shrink-0 mt-0.5" style={{ color:'var(--t-text-4)' }}>付款</p>
                    <p className="text-sm font-semibold" style={{ color:'var(--t-success)' }}>
                      {selected.receipt.payMethod}　NT$ {selected.receipt.total.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {selected.status==='confirmed' && (
                <div className="space-y-2">
                  <button onClick={() => { setPayForm({ total: String(selected.service.price), payMethod: PAY_METHODS[0] }); setPaying(true) }}
                    className="w-full py-3 rounded-full text-sm font-medium"
                    style={{ background:'var(--t-accent)', color:'var(--t-accent-fg)' }}>
                    確認完成並結帳
                  </button>
                  <button onClick={() => handleStatus(selected.id,'cancelled')}
                    className="w-full py-3 rounded-full text-sm font-medium"
                    style={{ background:'var(--t-elevated)', color:'var(--t-text-3)', border:'1.5px solid var(--t-border)' }}>
                    取消預約
                  </button>
                </div>
              )}
              {selected.status!=='confirmed' && (
                <button onClick={() => handleDelete(selected.id)}
                  className="w-full py-3 rounded-full text-sm font-medium"
                  style={{ background:'var(--t-danger-bg)', color:'var(--t-danger)', border:'1.5px solid var(--t-danger-bg)' }}>
                  刪除紀錄
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ══ ADD MODAL ══ */}
      {adding && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background:'rgba(28,28,26,0.4)' }}
          onClick={() => setAdding(false)}>
          <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl overflow-y-auto max-h-[90vh]"
            style={{ background:'var(--t-surface)', boxShadow:'var(--t-shadow-md)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="w-10 h-1 rounded-full" style={{ background:'var(--t-border-s)' }}/>
            </div>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom:'1px solid var(--t-border)' }}>
              <h3 className="text-base font-bold" style={{ color:'var(--t-text)' }}>新增預約</h3>
              <button onClick={() => setAdding(false)} className="p-1.5 rounded-lg" style={{ color:'var(--t-text-4)' }}>
                <X size={16} strokeWidth={2}/>
              </button>
            </div>
            <div className="px-6 py-5 space-y-5">

              {/* Customer */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color:'var(--t-text-3)' }}>顧客</label>
                {selectedCustomer ? (
                  <div className="flex items-center justify-between rounded-xl px-4 py-3"
                    style={{ background:'var(--t-elevated)', border:'1.5px solid var(--t-border)' }}>
                    <div>
                      <p className="text-sm font-semibold" style={{ color:'var(--t-text)' }}>{selectedCustomer.name}</p>
                      <p className="text-xs" style={{ color:'var(--t-text-4)' }}>{selectedCustomer.phone}</p>
                    </div>
                    <button onClick={() => { setForm(f=>({...f,customerId:''})); setCustQ(''); setCreatingCust(false) }}
                      className="text-xs font-medium" style={{ color:'var(--t-accent)' }}>更換</button>
                  </div>
                ) : creatingCust ? (
                  <div className="space-y-2.5">
                    {(['name','phone'] as const).map(k => (
                      <input key={k} value={newCust[k]} onChange={e => setNewCust(p=>({...p,[k]:e.target.value}))}
                        placeholder={k==='name'?'姓名':'電話（09xxxxxxxx）'}
                        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                        style={{ background:'var(--t-elevated)', border:'1.5px solid var(--t-border)', color:'var(--t-text)' }}
                        onFocus={e=>(e.currentTarget as HTMLElement).style.borderColor='var(--t-accent)'}
                        onBlur={e=>(e.currentTarget as HTMLElement).style.borderColor='var(--t-border)'}
                      />
                    ))}
                    <div className="flex gap-2 pt-1">
                      <button onClick={handleCreateCustomer} disabled={saving||!newCust.name||!newCust.phone}
                        className="flex-1 py-2.5 rounded-full text-sm font-medium disabled:opacity-50"
                        style={{ background:'var(--t-accent)', color:'var(--t-accent-fg)' }}>{saving?'建立中…':'建立顧客'}</button>
                      <button onClick={() => setCreatingCust(false)}
                        className="px-4 py-2.5 rounded-xl text-sm" style={{ background:'var(--t-elevated)', color:'var(--t-text-3)' }}>取消</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <input value={custQ} onChange={e => setCustQ(e.target.value)} placeholder="搜尋姓名或電話"
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none mb-2"
                      style={{ background:'var(--t-elevated)', border:'1.5px solid var(--t-border)', color:'var(--t-text)' }}
                      onFocus={e=>(e.currentTarget as HTMLElement).style.borderColor='var(--t-accent)'}
                      onBlur={e=>(e.currentTarget as HTMLElement).style.borderColor='var(--t-border)'}
                    />
                    {customers.length>0 && (
                      <div className="rounded-xl overflow-hidden mb-2" style={{ border:'1px solid var(--t-border)' }}>
                        {customers.slice(0,5).map(c => (
                          <button key={c.id} onClick={() => setForm(f=>({...f,customerId:c.id}))}
                            className="w-full text-left px-4 py-2.5 border-b last:border-0 transition-colors"
                            style={{ borderColor:'var(--color-line-soft)' }}
                            onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='var(--t-elevated)'}
                            onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=''}>
                            <p className="text-sm font-medium" style={{ color:'var(--t-text)' }}>{c.name}</p>
                            <p className="text-xs" style={{ color:'var(--t-text-4)' }}>{c.phone}</p>
                          </button>
                        ))}
                      </div>
                    )}
                    {custQ.length>0 && customers.length===0 && (
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs" style={{ color:'var(--t-text-4)' }}>查無顧客</p>
                        <button onClick={() => { setCreatingCust(true); setNewCust({name:custQ,phone:''}) }}
                          className="text-xs font-medium" style={{ color:'var(--t-accent)' }}>+ 新增顧客</button>
                      </div>
                    )}
                    {custQ.length===0 && (
                      <button onClick={() => setCreatingCust(true)} className="text-xs font-medium" style={{ color:'var(--t-text-4)' }}>+ 新增顧客</button>
                    )}
                  </div>
                )}
              </div>

              {/* Service */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color:'var(--t-text-3)' }}>服務項目</label>
                <select value={form.serviceId} onChange={e => setForm(f=>({...f,serviceId:e.target.value}))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none cursor-pointer appearance-none"
                  style={{ background:'var(--t-elevated)', border:'1.5px solid var(--t-border)', color:'var(--t-text)' }}>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name}（{s.durationMin}分　NT${s.price.toLocaleString()}）</option>)}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color:'var(--t-text-3)' }}>日期</label>
                <input type="date" value={form.date} onChange={e => setForm(f=>({...f,date:e.target.value}))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background:'var(--t-elevated)', border:'1.5px solid var(--t-border)', color:'var(--t-text)' }}
                  onFocus={e=>(e.currentTarget as HTMLElement).style.borderColor='var(--t-accent)'}
                  onBlur={e=>(e.currentTarget as HTMLElement).style.borderColor='var(--t-border)'}
                />
              </div>

              {/* Time slots */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color:'var(--t-text-3)' }}>時段</label>
                <div className="flex flex-wrap gap-2">
                  {slots.map(s => (
                    <button key={s} onClick={() => setForm(f=>({...f,time:s}))}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={form.time===s
                        ? { background:'var(--t-accent)', color:'var(--t-accent-fg)' }
                        : { background:'var(--t-elevated)', color:'var(--t-text-3)', border:'1.5px solid var(--t-border)' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color:'var(--t-text-3)' }}>備註（選填）</label>
                <input value={form.note} onChange={e => setForm(f=>({...f,note:e.target.value}))} placeholder="特殊需求、注意事項…"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background:'var(--t-elevated)', border:'1.5px solid var(--t-border)', color:'var(--t-text)' }}
                  onFocus={e=>(e.currentTarget as HTMLElement).style.borderColor='var(--t-accent)'}
                  onBlur={e=>(e.currentTarget as HTMLElement).style.borderColor='var(--t-border)'}
                />
              </div>
            </div>
            <div className="px-6 pb-6">
              <button onClick={handleAdd} disabled={saving||!form.customerId||!form.serviceId||!form.date||!form.time}
                className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-50"
                style={{ background:'var(--t-accent)', color:'var(--t-accent-fg)' }}>
                {saving?'建立中…':'建立預約'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ BLOCK MODAL ══ */}
      {addingBlock && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background:'rgba(28,28,26,0.4)' }}
          onClick={() => setAddingBlock(false)}>
          <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl overflow-y-auto max-h-[90vh]"
            style={{ background:'var(--t-surface)', boxShadow:'var(--t-shadow-md)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="w-10 h-1 rounded-full" style={{ background:'var(--t-border-s)' }}/>
            </div>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom:'1px solid var(--t-border)' }}>
              <h3 className="text-base font-bold" style={{ color:'var(--t-text)' }}>新增休假</h3>
              <button onClick={() => setAddingBlock(false)} className="p-1.5 rounded-lg" style={{ color:'var(--t-text-4)' }}>
                <X size={16} strokeWidth={2}/>
              </button>
            </div>
            <div className="px-6 py-5 space-y-5">
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color:'var(--t-text-3)' }}>日期</label>
                <input type="date" value={blockForm.date} onChange={e => setBlockForm(b => ({ ...b, date: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background:'var(--t-elevated)', border:'1.5px solid var(--t-border)', color:'var(--t-text)' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color:'var(--t-text-3)' }}>開始時段</label>
                <select value={blockForm.start} onChange={e => setBlockForm(b => ({ ...b, start: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background:'var(--t-elevated)', border:'1.5px solid var(--t-border)', color:'var(--t-text)' }}>
                  {slots.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color:'var(--t-text-3)' }}>結束時段</label>
                <select value={blockForm.end} onChange={e => setBlockForm(b => ({ ...b, end: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background:'var(--t-elevated)', border:'1.5px solid var(--t-border)', color:'var(--t-text)' }}>
                  {slots.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color:'var(--t-text-3)' }}>備註（選填）</label>
                <input value={blockForm.note} onChange={e => setBlockForm(b => ({ ...b, note: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background:'var(--t-elevated)', border:'1.5px solid var(--t-border)', color:'var(--t-text)' }} />
              </div>
            </div>
            <div className="px-6 pb-6">
              <button onClick={handleCreateBlock} disabled={creatingBlock||!blockForm.date||!blockForm.start||!blockForm.end}
                className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-50"
                style={{ background:'var(--t-accent)', color:'var(--t-accent-fg)' }}>
                {creatingBlock?'建立中…':'建立休假'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ PAY MODAL ══ */}
      {paying && selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background:'rgba(28,28,26,0.4)' }}
          onClick={() => setPaying(false)}>
          <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl"
            style={{ background:'var(--t-surface)', boxShadow:'var(--t-shadow-md)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="w-10 h-1 rounded-full" style={{ background:'var(--t-border-s)' }}/>
            </div>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom:'1px solid var(--t-border)' }}>
              <h3 className="text-base font-bold" style={{ color:'var(--t-text)' }}>確認結帳</h3>
              <button onClick={() => setPaying(false)} className="p-1.5 rounded-lg" style={{ color:'var(--t-text-4)' }}>
                <X size={16} strokeWidth={2}/>
              </button>
            </div>
            <div className="px-6 py-5 space-y-5">
              <div className="rounded-xl p-4" style={{ background:'var(--t-elevated)' }}>
                <p className="text-sm font-bold" style={{ color:'var(--t-text)' }}>{selected.customer.name}</p>
                <p className="text-xs mt-0.5" style={{ color:'var(--t-text-3)' }}>{selected.service.name}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color:'var(--t-text-3)' }}>金額（NT$）</label>
                <input type="number" value={payForm.total} onChange={e => setPayForm(f=>({...f,total:e.target.value}))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background:'var(--t-elevated)', border:'1.5px solid var(--t-border)', color:'var(--t-text)' }}
                  onFocus={e=>(e.currentTarget as HTMLElement).style.borderColor='var(--t-accent)'}
                  onBlur={e=>(e.currentTarget as HTMLElement).style.borderColor='var(--t-border)'}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color:'var(--t-text-3)' }}>付款方式</label>
                <div className="grid grid-cols-2 gap-2">
                  {PAY_METHODS.map(m => (
                    <button key={m} onClick={() => setPayForm(f=>({...f,payMethod:m}))}
                      className="py-2.5 rounded-full text-sm font-medium transition-all"
                      style={payForm.payMethod===m
                        ? { background:'var(--t-accent)', color:'var(--t-accent-fg)' }
                        : { background:'var(--t-elevated)', color:'var(--t-text-3)', border:'1.5px solid var(--t-border)' }}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 pb-6">
              <button onClick={handlePay} disabled={saving||!payForm.total}
                className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-50"
                style={{ background:'var(--t-success)', color:'#fff' }}>
                {saving?'處理中…':'確認收款'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
