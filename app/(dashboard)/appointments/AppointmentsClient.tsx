'use client'

import { useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'

type Customer = { id: string; name: string; phone: string }
type Service  = { id: string; name: string; durationMin: number; price: number }
type Appt = {
  id: string; scheduledAt: string; status: string; note: string | null
  customer: Customer; service: Service
  receipt: { total: number; payMethod: string } | null
}

const STATUS = {
  confirmed: { label: '已確認', color: '#1255CC', bg: 'rgba(18,85,204,0.10)', border: 'rgba(18,85,204,0.30)' },
  completed: { label: '已完成', color: '#059669', bg: 'rgba(5,150,105,0.10)',  border: 'rgba(5,150,105,0.30)'  },
  cancelled:  { label: '已取消', color: '#9CA3AF', bg: 'rgba(156,163,175,0.08)', border: 'rgba(156,163,175,0.25)' },
}
const PAY_METHODS = ['現金', '信用卡', 'Line Pay', '轉帳']
const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']
const BUFFER_MIN = 60

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
function apptMatchesSlot(appt: Appt, slot: string) {
  const d = new Date(appt.scheduledAt)
  const [h, m] = slot.split(':').map(Number)
  return d.getHours() === h && d.getMinutes() === m
}
function calcBlocked(appts: Appt[], allSlots: string[]): Set<string> {
  const blocked = new Set<string>()
  appts.filter(a => a.status !== 'cancelled').forEach(a => {
    const d = new Date(a.scheduledAt)
    const start = d.getHours()*60 + d.getMinutes()
    const end   = start + a.service.durationMin + BUFFER_MIN
    allSlots.forEach(slot => {
      const [sh, sm] = slot.split(':').map(Number)
      const slotMin  = sh*60 + sm
      if (slotMin > start && slotMin < end) blocked.add(slot)
    })
  })
  return blocked
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

  const [view, setView]           = useState<'month'|'week'|'day'>('week')
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [date, setDate]           = useState(today)
  const [month, setMonth]         = useState(toMonthStr(new Date()))

  const [monthData, setMonthData] = useState<Record<string, Appt[]>>(initialMonthData)
  const [slots, setSlots]         = useState<string[]>(initialSlots)
  const [selected, setSelected]   = useState<Appt|null>(null)

  const [adding, setAdding]         = useState(false)
  const [paying, setPaying]         = useState(false)
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

  const loadMonth = useCallback((m: string) => {
    setMonthData(prev => { if (prev[m]) return prev; fetchMonth(m); return prev })
  }, [fetchMonth])

  const reload = useCallback(async () => {
    const months = view === 'week'
      ? [...new Set(getWeekDays(weekStart).map(d => toMonthStr(d)))]
      : view === 'month' ? [month]
      : [toMonthStr(new Date(date + 'T00:00:00'))]
    await Promise.all(months.map(fetchMonth))
  }, [view, weekStart, month, date, fetchMonth])

  useEffect(() => {
    if (view === 'week') getWeekDays(weekStart).map(d => toMonthStr(d)).forEach(loadMonth)
    else if (view === 'month') loadMonth(month)
    else loadMonth(toMonthStr(new Date(date + 'T00:00:00')))
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

  const selectedCustomer = customers.find(c => c.id === form.customerId)

  // ── shared sub-components ──

  function ApptCard({ a, compact = false }: { a: Appt; compact?: boolean }) {
    const cfg = STATUS[a.status as keyof typeof STATUS] ?? STATUS.confirmed
    const isSel = selected?.id === a.id
    return (
      <div onClick={() => setSelected(isSel ? null : a)}
        className="cursor-pointer rounded-lg transition-all"
        style={{
          background: isSel ? cfg.color : cfg.bg,
          border: `1.5px solid ${isSel ? cfg.color : cfg.border}`,
          color: isSel ? '#fff' : cfg.color,
          opacity: a.status==='cancelled' ? 0.55 : 1,
          padding: compact ? '4px 8px' : '6px 10px',
          marginBottom: 3,
        }}>
        <p className="font-semibold truncate leading-tight" style={{ fontSize: compact ? 11 : 12 }}>{a.customer.name}</p>
        <p className="truncate leading-tight opacity-75" style={{ fontSize: 10 }}>{a.service.name}</p>
      </div>
    )
  }

  function CellSlot({ ds, slot, dayAppts, blocked }: { ds: string; slot: string; dayAppts: Appt[]; blocked: boolean }) {
    const cellAppts = dayAppts.filter(a => apptMatchesSlot(a, slot))
    return (
      <div className="relative group h-full p-1">
        {cellAppts.map(a => <ApptCard key={a.id} a={a} compact />)}
        {!blocked && cellAppts.length === 0 && (
          <button onClick={() => openAdd(ds, slot)}
            className="absolute inset-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"
            style={{ border: '1.5px dashed rgba(18,85,204,0.25)', background: 'rgba(18,85,204,0.04)' }}>
            <Plus size={13} strokeWidth={2.5} style={{ color: 'var(--t-accent)' }} />
          </button>
        )}
        {blocked && cellAppts.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <span style={{ fontSize: 9, color: 'var(--t-text-4)' }}>緩衝</span>
          </div>
        )}
      </div>
    )
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      {/* ── header ── */}
      <div className="shrink-0 flex items-center justify-between gap-3 px-4 lg:px-6 h-14"
        style={{ background:'var(--t-surface)', borderBottom:'1px solid var(--t-border)' }}>

        <div className="flex items-center gap-2 min-w-0">
          {/* View tabs */}
          <div className="flex rounded-xl p-0.5 gap-0.5" style={{ background:'var(--t-elevated)' }}>
            {(['month','week','day'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={view===v
                  ? { background:'var(--t-surface)', color:'var(--t-accent)', boxShadow:'0 1px 3px rgba(0,0,0,0.10)' }
                  : { color:'var(--t-text-3)' }}>
                {v==='month'?'月':v==='week'?'週':'日'}
              </button>
            ))}
          </div>

          {/* Nav arrows */}
          {(['prev','label','next'] as const).map(part => {
            if (part === 'label') return (
              <button key="label" onClick={() => { const n=new Date(); setWeekStart(getMonday(n)); setDate(toDateStr(n)); setMonth(toMonthStr(n)) }}
                className="text-sm font-semibold min-w-[120px] text-center truncate hidden sm:block"
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
              <button key={part} onClick={shift} className="p-1.5 rounded-lg shrink-0" style={{ color:'var(--t-text-4)' }}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='var(--t-elevated)'}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=''}>
                {part==='prev' ? <ChevronLeft size={16} strokeWidth={2}/> : <ChevronRight size={16} strokeWidth={2}/>}
              </button>
            )
          })}
        </div>

        <button onClick={() => openAdd()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold shrink-0 transition-all"
          style={{ background:'var(--t-accent)', color:'#fff' }}>
          <Plus size={14} strokeWidth={2.5}/>
          <span className="hidden sm:inline">新增預約</span>
          <span className="sm:hidden">新增</span>
        </button>
      </div>

      {/* ── body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ══ WEEK VIEW ══ */}
        {view==='week' && (
          <div className={`flex flex-col flex-1 overflow-hidden ${selected ? 'hidden lg:flex' : ''}`}
            style={{ background:'var(--t-bg)' }}>
            <div className="flex-1 overflow-auto">
              <div className="min-w-[580px]">

                {/* Day header row */}
                <div className="sticky top-0 z-10 grid border-b"
                  style={{ gridTemplateColumns:'56px repeat(7,minmax(0,1fr))', background:'var(--t-surface)', borderColor:'var(--t-border)' }}>
                  <div className="border-r" style={{ borderColor:'var(--t-border)' }}/>
                  {weekDays.map(day => {
                    const ds = toDateStr(day)
                    const isToday = ds===today
                    const cnt = (byDate[ds]??[]).filter(a=>a.status!=='cancelled').length
                    return (
                      <div key={ds} className="flex flex-col items-center py-2.5 border-r last:border-r-0"
                        style={{ borderColor:'var(--t-border)', background: isToday?'rgba(18,85,204,0.03)':'' }}>
                        <span className="text-[11px] mb-1" style={{ color: day.getDay()===0?'#DC2626':'var(--t-text-4)' }}>
                          {WEEKDAY_LABELS[day.getDay()]}
                        </span>
                        <span className="w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold"
                          style={isToday
                            ? { background:'var(--t-accent)', color:'#fff' }
                            : { color: day.getDay()===0?'#DC2626':'var(--t-text)' }}>
                          {day.getDate()}
                        </span>
                        {cnt > 0 && (
                          <span className="mt-1 text-[10px] font-medium px-1.5 rounded-full"
                            style={{ background:'rgba(18,85,204,0.10)', color:'var(--t-accent)' }}>{cnt}</span>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Slot rows */}
                {slots.map(slot => (
                  <div key={slot} className="grid border-b"
                    style={{ gridTemplateColumns:'56px repeat(7,minmax(0,1fr))', borderColor:'var(--t-border)', minHeight:64 }}>
                    <div className="border-r flex items-start justify-center pt-2 shrink-0"
                      style={{ borderColor:'var(--t-border)' }}>
                      <span className="text-[11px] tabular-nums font-medium" style={{ color:'var(--t-text-4)' }}>{slot}</span>
                    </div>
                    {weekDays.map(day => {
                      const ds = toDateStr(day)
                      const dayAppts = byDate[ds]??[]
                      const blocked  = calcBlocked(dayAppts, slots).has(slot)
                      return (
                        <div key={ds} className="border-r last:border-r-0"
                          style={{ borderColor:'var(--t-border)', background: blocked?'rgba(0,0,0,0.02)': toDateStr(day)===today?'rgba(18,85,204,0.02)':'' }}>
                          <CellSlot ds={ds} slot={slot} dayAppts={dayAppts} blocked={blocked}/>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ DAY VIEW ══ */}
        {view==='day' && (
          <div className={`flex flex-col flex-1 overflow-hidden ${selected ? 'hidden lg:flex' : ''}`}>
            <div className="flex items-center justify-between px-4 py-2.5 shrink-0"
              style={{ background:'var(--t-surface)', borderBottom:'1px solid var(--t-border)' }}>
              <button onClick={() => { const d=new Date(date+'T00:00:00'); d.setDate(d.getDate()-1); setDate(toDateStr(d)) }}
                className="p-1.5 rounded-lg" style={{ color:'var(--t-text-3)' }}>
                <ChevronLeft size={15} strokeWidth={2}/>
              </button>
              <p className="text-sm font-semibold" style={{ color:'var(--t-text)' }}>
                {new Date(date+'T00:00:00').toLocaleDateString('zh-TW',{month:'long',day:'numeric',weekday:'long'})}
              </p>
              <button onClick={() => { const d=new Date(date+'T00:00:00'); d.setDate(d.getDate()+1); setDate(toDateStr(d)) }}
                className="p-1.5 rounded-lg" style={{ color:'var(--t-text-3)' }}>
                <ChevronRight size={15} strokeWidth={2}/>
              </button>
            </div>
            <div className="flex-1 overflow-auto" style={{ background:'var(--t-bg)' }}>
              {slots.map(slot => {
                const dayAppts = byDate[date]??[]
                const cellAppts = dayAppts.filter(a => apptMatchesSlot(a, slot))
                const blocked   = calcBlocked(dayAppts, slots).has(slot)
                return (
                  <div key={slot} className="flex border-b group"
                    style={{ borderColor:'var(--t-border)', minHeight:72 }}>
                    <div className="w-16 shrink-0 flex items-start justify-center pt-3 border-r"
                      style={{ borderColor:'var(--t-border)', background: blocked?'rgba(0,0,0,0.015)':'' }}>
                      <span className="text-xs tabular-nums font-medium" style={{ color:'var(--t-text-4)' }}>{slot}</span>
                    </div>
                    <div className="flex-1 p-2 relative">
                      {cellAppts.map(a => {
                        const cfg = STATUS[a.status as keyof typeof STATUS]??STATUS.confirmed
                        const isSel = selected?.id===a.id
                        return (
                          <div key={a.id} onClick={() => setSelected(isSel ? null : a)}
                            className="cursor-pointer rounded-xl px-4 py-3 mb-1.5 transition-all"
                            style={{ background: isSel?cfg.color:cfg.bg, border:`1.5px solid ${isSel?cfg.color:cfg.border}`,
                              color: isSel?'#fff':cfg.color, opacity: a.status==='cancelled'?0.5:1 }}>
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold">{a.customer.name}</p>
                              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0"
                                style={{ background: isSel?'rgba(255,255,255,0.2)':'rgba(0,0,0,0.05)' }}>{cfg.label}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs opacity-70">
                              <span>{a.service.name}</span>
                              <span>{a.service.durationMin} 分鐘</span>
                              <span>NT$ {a.service.price.toLocaleString()}</span>
                            </div>
                          </div>
                        )
                      })}
                      {!blocked && cellAppts.length===0 && (
                        <button onClick={() => openAdd(date, slot)}
                          className="absolute inset-1 rounded-xl opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-1"
                          style={{ border:'1.5px dashed var(--t-border-s)', color:'var(--t-text-4)' }}>
                          <Plus size={13} strokeWidth={2}/><span className="text-xs">新增</span>
                        </button>
                      )}
                      {blocked && cellAppts.length===0 && (
                        <div className="flex items-center h-full min-h-[48px] px-2">
                          <span className="text-xs" style={{ color:'var(--t-text-4)' }}>緩衝時段</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              <div className="px-5 py-3 text-xs" style={{ color:'var(--t-text-4)' }}>
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
                    style={{ color: i===0?'#DC2626':'var(--t-text-4)' }}>{w}</div>
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
                        border: ds===date?'1.5px solid rgba(18,85,204,0.35)':'1.5px solid transparent' }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold"
                          style={isToday?{ background:'var(--t-accent)', color:'#fff' }:{ color: d.getDay()===0?'#DC2626':'var(--t-text-3)' }}>
                          {d.getDate()}
                        </span>
                        {activeCount>0 && (
                          <span className="text-[9px] font-semibold px-1 rounded-full"
                            style={{ background:'rgba(18,85,204,0.10)', color:'var(--t-accent)' }}>{activeCount}</span>
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
                    <p className="text-sm font-semibold" style={{ color:'#059669' }}>
                      {selected.receipt.payMethod}　NT$ {selected.receipt.total.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {selected.status==='confirmed' && (
                <div className="space-y-2">
                  <button onClick={() => { setPayForm({ total: String(selected.service.price), payMethod: PAY_METHODS[0] }); setPaying(true) }}
                    className="w-full py-3 rounded-xl text-sm font-semibold"
                    style={{ background:'var(--t-accent)', color:'#fff' }}>
                    確認完成並結帳
                  </button>
                  <button onClick={() => handleStatus(selected.id,'cancelled')}
                    className="w-full py-3 rounded-xl text-sm font-medium"
                    style={{ background:'var(--t-elevated)', color:'var(--t-text-3)', border:'1.5px solid var(--t-border)' }}>
                    取消預約
                  </button>
                </div>
              )}
              {selected.status!=='confirmed' && (
                <button onClick={() => handleDelete(selected.id)}
                  className="w-full py-3 rounded-xl text-sm font-medium"
                  style={{ background:'rgba(220,38,38,0.07)', color:'#DC2626', border:'1.5px solid rgba(220,38,38,0.20)' }}>
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
          style={{ background:'rgba(15,30,56,0.45)', backdropFilter:'blur(4px)' }}
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
                    style={{ background:'rgba(18,85,204,0.06)', border:'1.5px solid rgba(18,85,204,0.20)' }}>
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
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                        style={{ background:'var(--t-accent)', color:'#fff' }}>{saving?'建立中…':'建立顧客'}</button>
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
                            style={{ borderColor:'var(--t-border)' }}
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
                        ? { background:'var(--t-accent)', color:'#fff' }
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
                style={{ background:'var(--t-accent)', color:'#fff' }}>
                {saving?'建立中…':'建立預約'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ PAY MODAL ══ */}
      {paying && selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background:'rgba(15,30,56,0.45)', backdropFilter:'blur(4px)' }}
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
                      className="py-2.5 rounded-xl text-sm font-semibold transition-all"
                      style={payForm.payMethod===m
                        ? { background:'var(--t-accent)', color:'#fff' }
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
                style={{ background:'#059669', color:'#fff' }}>
                {saving?'處理中…':'確認收款'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
