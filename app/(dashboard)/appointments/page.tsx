'use client'

import { useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus, User } from 'lucide-react'

type Customer = { id: string; name: string; phone: string }
type Service  = { id: string; name: string; durationMin: number; price: number }
type Appt = {
  id: string; scheduledAt: string; status: string; note: string | null
  customer: Customer; service: Service
  receipt: { total: number; payMethod: string } | null
}

const STATUS = {
  confirmed: { label: '已確認', style: 'text-[var(--t-accent)] border border-[var(--t-accent-bg)]' },
  completed: { label: '已完成', style: 'text-[#6B9E78] border border-[rgba(107,158,120,0.2)]' },
  cancelled:  { label: '已取消', style: 'text-[#A06060] border border-[rgba(160,96,96,0.2)]' },
}
const STATUS_DOT: Record<string, string> = {
  confirmed: 'bg-[var(--t-accent)]',
  completed: 'bg-[#6B9E78]',
  cancelled:  'bg-[#A06060]',
}
const PAY_METHODS = ['現金', '信用卡', 'Line Pay', '轉帳']
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

const toDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const toMonthStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
const fmtDateLabel = (d: Date) => d.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'short' })

function buildCalendar(year: number, month: number) {
  const first = new Date(year, month, 1)
  const last  = new Date(year, month + 1, 0)
  const days: Date[] = []
  for (let i = 0; i < first.getDay(); i++) days.push(new Date(year, month, -first.getDay() + i + 1))
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d))
  const rem = 7 - (days.length % 7)
  if (rem < 7) for (let d = 1; d <= rem; d++) days.push(new Date(year, month + 1, d))
  return days
}

export default function AppointmentsPage() {
  const today = toDateStr(new Date())
  const [view, setView]     = useState<'month' | 'day'>('month')
  const [date, setDate]     = useState(today)
  const [month, setMonth]   = useState(toMonthStr(new Date()))
  const [dayAppts, setDayAppts]     = useState<Appt[]>([])
  const [monthAppts, setMonthAppts] = useState<Appt[]>([])
  const [selected, setSelected]     = useState<Appt | null>(null)
  const [slots, setSlots]           = useState<string[]>([])
  const [adding, setAdding]   = useState(false)
  const [paying, setPaying]   = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [services, setServices]   = useState<Service[]>([])
  const [custQ, setCustQ]         = useState('')
  const [form, setForm] = useState({ customerId: '', serviceId: '', date: '', time: '', note: '' })
  const [payForm, setPayForm] = useState({ total: '', payMethod: PAY_METHODS[0] })
  const [saving, setSaving] = useState(false)

  const loadDay = useCallback(async (d: string) => {
    const res = await fetch(`/api/appointments?date=${d}`)
    if (res.ok) setDayAppts(await res.json())
  }, [])

  const loadMonth = useCallback(async (m: string) => {
    const res = await fetch(`/api/appointments?month=${m}`)
    if (res.ok) setMonthAppts(await res.json())
  }, [])

  useEffect(() => { loadMonth(month) }, [month, loadMonth])
  useEffect(() => { loadDay(date) }, [date, loadDay])
  useEffect(() => { fetch('/api/services').then(r => r.ok ? r.json() : []).then(setServices) }, [])
  useEffect(() => { fetch('/api/settings/slots').then(r => r.ok ? r.json() : { slots: [] }).then(d => setSlots(d.slots)) }, [])
  useEffect(() => {
    const t = setTimeout(async () => {
      const res = await fetch(`/api/customers?q=${encodeURIComponent(custQ)}`)
      if (res.ok) setCustomers(await res.json())
    }, 250)
    return () => clearTimeout(t)
  }, [custQ])

  const [calYear, calMonth] = month.split('-').map(Number)
  const calDays = buildCalendar(calYear, calMonth - 1)
  const apptsByDate: Record<string, Appt[]> = {}
  monthAppts.forEach(a => {
    const d = a.scheduledAt.slice(0, 10)
    ;(apptsByDate[d] ??= []).push(a)
  })

  function selectDay(d: Date) {
    setDate(toDateStr(d))
    setSelected(null)
  }

  function shiftMonth(dir: 1 | -1) {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 1 + dir, 1)
    setMonth(toMonthStr(d))
  }

  function shiftDay(dir: 1 | -1) {
    const d = new Date(date + 'T00:00:00')
    d.setDate(d.getDate() + dir)
    setDate(toDateStr(d))
  }

  function openAdd(preSlot?: string) {
    const d = view === 'day' ? date : date || today
    setForm({ customerId: '', serviceId: services[0]?.id ?? '', date: d, time: preSlot ?? slots[0] ?? '10:00', note: '' })
    setCustQ(''); setAdding(true)
  }

  async function handleAdd() {
    if (!form.customerId || !form.serviceId || !form.date || !form.time) return
    setSaving(true)
    const scheduledAt = new Date(`${form.date}T${form.time}:00`).toISOString()
    await fetch('/api/appointments', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: form.customerId, serviceId: form.serviceId, scheduledAt, note: form.note }),
    })
    setSaving(false); setAdding(false)
    loadMonth(month); loadDay(date)
  }

  async function handleStatus(id: string, status: string) {
    await fetch(`/api/appointments/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setSelected(prev => prev?.id === id ? { ...prev, status } : prev)
    loadMonth(month); loadDay(date)
  }

  async function handlePay() {
    if (!selected) return
    setSaving(true)
    await fetch(`/api/appointments/${selected.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed', total: Number(payForm.total), payMethod: payForm.payMethod }),
    })
    setSaving(false); setPaying(false)
    loadMonth(month); loadDay(date)
    const updated = await fetch(`/api/appointments?date=${date}`).then(r => r.json())
    setSelected(updated.find((a: Appt) => a.id === selected.id) ?? null)
  }

  async function handleDelete(id: string) {
    if (!confirm('確定要刪除這筆預約？')) return
    await fetch(`/api/appointments/${id}`, { method: 'DELETE' })
    setSelected(null); loadMonth(month); loadDay(date)
  }

  const selectedCustomer = customers.find(c => c.id === form.customerId)
  const sidebarAppts = apptsByDate[date] ?? []

  // Slot grid: match appointments to slots by start time
  function slotAppts(slot: string, appts: Appt[]) {
    const [h, m] = slot.split(':').map(Number)
    return appts.filter(a => {
      const d = new Date(a.scheduledAt)
      return d.getHours() === h && d.getMinutes() === m
    })
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-[var(--t-border)] bg-[var(--t-surface)] flex items-center justify-between px-4 lg:px-8 shrink-0 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex border border-[var(--t-border)] shrink-0">
            {(['month', 'day'] as const).map((v, i) => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1 text-[10px] tracking-[0.2em] uppercase transition-colors ${i === 0 ? '' : 'border-l border-[var(--t-border)]'} ${
                  view === v ? 'bg-[var(--t-accent)] text-[var(--t-accent-fg)]' : 'text-[var(--t-text-3)] hover:text-[var(--t-text-2)]'
                }`}>{v === 'month' ? '月' : '日'}</button>
            ))}
          </div>

          <button onClick={() => view === 'month' ? shiftMonth(-1) : shiftDay(-1)}
            className="text-[var(--t-text-4)] hover:text-[var(--t-text-2)] transition-colors shrink-0"><ChevronLeft size={15} strokeWidth={1.5} /></button>

          <button onClick={() => { const n = new Date(); setDate(toDateStr(n)); setMonth(toMonthStr(n)) }}
            className="text-[10px] tracking-[0.2em] text-[var(--t-text-3)] hover:text-[var(--t-accent)] uppercase transition-colors truncate">
            {view === 'month'
              ? `${calYear} 年 ${calMonth} 月`
              : fmtDateLabel(new Date(date + 'T00:00:00'))
            }
          </button>

          <button onClick={() => view === 'month' ? shiftMonth(1) : shiftDay(1)}
            className="text-[var(--t-text-4)] hover:text-[var(--t-text-2)] transition-colors shrink-0"><ChevronRight size={15} strokeWidth={1.5} /></button>
        </div>

        <button onClick={() => openAdd()}
          className="flex items-center gap-2 border border-[var(--t-accent)] text-[var(--t-accent)] hover:bg-[var(--t-accent)] hover:text-[var(--t-accent-fg)] px-4 lg:px-5 py-1.5 text-[10px] tracking-[0.2em] uppercase transition-all duration-200 shrink-0">
          <Plus size={11} /><span className="hidden sm:inline">新增預約</span><span className="sm:hidden">新增</span>
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Month calendar ── */}
        {view === 'month' && (
          <div className={`flex flex-col overflow-hidden ${selected ? 'hidden lg:flex lg:flex-1' : 'flex-1'}`}>
            <div className="flex-1 overflow-auto bg-[var(--t-bg)] p-4 lg:p-6">
              <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS.map((w, i) => (
                  <div key={w} className={`text-center py-2 text-[10px] tracking-[0.2em] ${i === 0 ? 'text-[#A06060]' : i === 6 ? 'text-[var(--t-accent)]' : 'text-[var(--t-text-4)]'}`}>{w}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-px bg-[var(--t-border)]">
                {calDays.map((d, i) => {
                  const ds = toDateStr(d)
                  const isThisMonth = d.getMonth() === calMonth - 1
                  const isToday = ds === today
                  const isSelected = ds === date
                  const cellAppts = apptsByDate[ds] ?? []
                  const activeCount = cellAppts.filter(a => a.status !== 'cancelled').length
                  return (
                    <div key={i} onClick={() => selectDay(d)}
                      className={`bg-[var(--t-surface)] min-h-[72px] lg:min-h-[90px] p-2 cursor-pointer hover:bg-[var(--t-bg)] transition-colors ${
                        isSelected ? 'ring-1 ring-inset ring-[var(--t-accent)]' : ''
                      } ${!isThisMonth ? 'opacity-30' : ''}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-xs w-6 h-6 flex items-center justify-center leading-none ${
                          isToday ? 'bg-[var(--t-accent)] text-[var(--t-accent-fg)] rounded-full' :
                          d.getDay() === 0 ? 'text-[#A06060]' : d.getDay() === 6 ? 'text-[var(--t-accent)]' : 'text-[var(--t-text-3)]'
                        }`}>{d.getDate()}</span>
                        {activeCount > 0 && <span className="text-[9px] text-[var(--t-text-4)]">{activeCount}</span>}
                      </div>
                      <div className="space-y-0.5">
                        {cellAppts.slice(0, 3).map(a => (
                          <div key={a.id} className="flex items-center gap-1 overflow-hidden">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[a.status]}`} />
                            <span className="text-[10px] text-[var(--t-text-3)] truncate leading-tight">{fmtTime(a.scheduledAt)} {a.customer.name}</span>
                          </div>
                        ))}
                        {cellAppts.length > 3 && <p className="text-[9px] text-[var(--t-text-4)] pl-2.5">+{cellAppts.length - 3}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Day view: slot timetable ── */}
        {view === 'day' && (
          <div className={`flex flex-col overflow-hidden bg-[var(--t-bg)] ${selected ? 'hidden lg:flex lg:flex-1' : 'flex-1'}`}>
            <div className="flex-1 overflow-auto">
              {slots.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-[10px] text-[var(--t-text-4)] tracking-widest">載入中</div>
              ) : (
                slots.map(slot => {
                  const appts = slotAppts(slot, dayAppts)
                  return (
                    <div key={slot} className="flex border-b border-[var(--t-border)] group min-h-[72px]">
                      {/* Time label */}
                      <div className="w-14 shrink-0 py-4 px-3 border-r border-[var(--t-border)] flex items-start">
                        <span className="text-[10px] text-[var(--t-text-4)] tabular-nums tracking-wide">{slot}</span>
                      </div>
                      {/* Slot content */}
                      <div className="flex-1 p-2 relative">
                        {appts.length > 0 ? (
                          <div className="space-y-1.5">
                            {appts.map(a => (
                              <div key={a.id} onClick={() => setSelected(a)}
                                className={`cursor-pointer border px-4 py-3 transition-colors ${
                                  selected?.id === a.id ? 'border-[var(--t-accent)] bg-[var(--t-surface)]' : 'border-[var(--t-border)] bg-[var(--t-surface)] hover:border-[var(--t-border-s)]'
                                } ${a.status === 'cancelled' ? 'opacity-40' : ''}`}>
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[a.status]}`} />
                                    <span className="text-xs font-light text-[var(--t-text)] tracking-wide">{a.customer.name}</span>
                                  </div>
                                  <span className={`px-2 py-0.5 text-[10px] tracking-wide ${STATUS[a.status as keyof typeof STATUS]?.style}`}>
                                    {STATUS[a.status as keyof typeof STATUS]?.label}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 ml-3.5">
                                  <span className="text-[10px] text-[var(--t-text-3)]">{a.service.name}</span>
                                  <span className="text-[10px] text-[var(--t-text-4)]">{a.service.durationMin} 分鐘</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <button onClick={() => openAdd(slot)}
                            className="absolute inset-1 border border-dashed border-transparent group-hover:border-[var(--t-border)] text-[var(--t-text-4)] text-[10px] tracking-widest opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-1 hover:border-[var(--t-border-s)]">
                            <Plus size={10} strokeWidth={1.5} /> 新增
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <div className="px-6 py-3 border-t border-[var(--t-border)] bg-[var(--t-surface)] shrink-0">
              <p className="text-[10px] text-[var(--t-text-4)] tracking-wide">{dayAppts.filter(a => a.status !== 'cancelled').length} 筆預約</p>
            </div>
          </div>
        )}

        {/* ── Month sidebar: slot timetable for selected day ── */}
        {view === 'month' && (
          <div className={`flex flex-col overflow-hidden bg-[var(--t-bg)] border-l border-[var(--t-border)] ${selected ? 'flex-1' : 'hidden lg:flex lg:w-72'}`}>
            <div className="px-5 py-3.5 border-b border-[var(--t-border)] bg-[var(--t-surface)] shrink-0">
              <p className="text-[10px] tracking-[0.25em] text-[var(--t-text-3)] uppercase">
                {fmtDateLabel(new Date(date + 'T00:00:00'))}
              </p>
            </div>
            <div className="flex-1 overflow-auto">
              {slots.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-[10px] text-[var(--t-text-4)]">載入中</div>
              ) : (
                slots.map(slot => {
                  const appts = slotAppts(slot, sidebarAppts)
                  return (
                    <div key={slot} className="flex border-b border-[var(--t-border)] group min-h-[56px]">
                      <div className="w-12 shrink-0 py-3 px-2 border-r border-[var(--t-border)] flex items-start">
                        <span className="text-[9px] text-[var(--t-text-4)] tabular-nums">{slot}</span>
                      </div>
                      <div className="flex-1 p-1.5 relative">
                        {appts.length > 0 ? (
                          <div className="space-y-1">
                            {appts.map(a => (
                              <div key={a.id} onClick={() => setSelected(a)}
                                className={`cursor-pointer border px-3 py-2 transition-colors ${
                                  selected?.id === a.id ? 'border-[var(--t-accent)] bg-[var(--t-surface)]' : 'border-[var(--t-border)] bg-[var(--t-surface)] hover:border-[var(--t-border-s)]'
                                } ${a.status === 'cancelled' ? 'opacity-40' : ''}`}>
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[a.status]}`} />
                                  <span className="text-[11px] text-[var(--t-text)] truncate">{a.customer.name}</span>
                                </div>
                                <p className="text-[10px] text-[var(--t-text-4)] ml-3">{a.service.name}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <button onClick={() => openAdd(slot)}
                            className="absolute inset-0.5 border border-dashed border-transparent group-hover:border-[var(--t-border)] opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                            <Plus size={9} strokeWidth={1.5} className="text-[var(--t-text-4)]" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* ── Detail panel ── */}
        {selected && (
          <div className="flex-1 lg:max-w-xs flex flex-col overflow-hidden bg-[var(--t-bg)] border-l border-[var(--t-border)]">
            <div className="px-4 lg:px-6 py-4 border-b border-[var(--t-border)] bg-[var(--t-surface)] flex items-start justify-between shrink-0">
              <div>
                <p className="text-sm font-light text-[var(--t-text)] tracking-wide mb-0.5">{selected.customer.name}</p>
                <p className="text-[10px] text-[var(--t-text-4)] tracking-wide">{selected.customer.phone}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-[var(--t-text-4)] hover:text-[var(--t-text-2)] text-lg leading-none">×</button>
            </div>
            <div className="flex-1 overflow-auto p-4 lg:p-6 space-y-4">
              <div className="bg-[var(--t-surface)] border border-[var(--t-border)] px-5 py-4 space-y-3">
                {[
                  ['服務', selected.service.name],
                  ['時間', fmtTime(selected.scheduledAt)],
                  ['時長', `${selected.service.durationMin} 分鐘`],
                  ['金額', `NT$ ${selected.service.price.toLocaleString()}`],
                  ['備註', selected.note || '—'],
                  ['狀態', STATUS[selected.status as keyof typeof STATUS]?.label ?? selected.status],
                ].map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[64px_1fr] gap-2">
                    <p className="text-[10px] text-[var(--t-text-4)] tracking-[0.15em] uppercase pt-0.5">{label}</p>
                    <p className="text-xs text-[var(--t-text-2)] font-light">{value}</p>
                  </div>
                ))}
                {selected.receipt && (
                  <div className="grid grid-cols-[64px_1fr] gap-2 pt-2 border-t border-[var(--t-border)]">
                    <p className="text-[10px] text-[var(--t-text-4)] tracking-[0.15em] uppercase pt-0.5">付款</p>
                    <p className="text-xs text-[#6B9E78]">{selected.receipt.payMethod}　NT$ {selected.receipt.total.toLocaleString()}</p>
                  </div>
                )}
              </div>
              {selected.status === 'confirmed' && (
                <div className="space-y-2">
                  <button onClick={() => { setPayForm({ total: String(selected.service.price), payMethod: PAY_METHODS[0] }); setPaying(true) }}
                    className="w-full border border-[var(--t-accent)] text-[var(--t-accent)] hover:bg-[var(--t-accent)] hover:text-[var(--t-accent-fg)] py-2.5 text-[10px] tracking-[0.25em] uppercase transition-all duration-200">
                    確認完成並結帳
                  </button>
                  <button onClick={() => handleStatus(selected.id, 'cancelled')}
                    className="w-full border border-[var(--t-border-s)] text-[var(--t-text-3)] hover:border-[#A06060] hover:text-[#A06060] py-2.5 text-[10px] tracking-[0.25em] uppercase transition-all duration-200">
                    取消預約
                  </button>
                </div>
              )}
              {selected.status !== 'confirmed' && (
                <button onClick={() => handleDelete(selected.id)}
                  className="w-full border border-[var(--t-border-s)] text-[var(--t-text-4)] hover:border-[#A06060] hover:text-[#A06060] py-2.5 text-[10px] tracking-[0.25em] uppercase transition-all duration-200">
                  刪除紀錄
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Add modal ── */}
      {adding && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--t-surface)] border border-[var(--t-border)] w-full max-w-sm p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <p className="text-[10px] tracking-[0.3em] text-[var(--t-text-2)] uppercase">新增預約</p>
              <button onClick={() => setAdding(false)} className="text-[var(--t-text-4)] hover:text-[var(--t-text-2)] text-lg leading-none">×</button>
            </div>
            <div className="space-y-5">
              {/* Customer */}
              <div>
                <label className="text-[10px] text-[var(--t-text-3)] tracking-[0.25em] uppercase mb-2 block">顧客</label>
                {selectedCustomer ? (
                  <div className="flex items-center justify-between border-b border-[var(--t-accent)] py-2">
                    <div><p className="text-sm text-[var(--t-text)]">{selectedCustomer.name}</p><p className="text-[10px] text-[var(--t-text-4)]">{selectedCustomer.phone}</p></div>
                    <button onClick={() => { setForm(f => ({ ...f, customerId: '' })); setCustQ('') }} className="text-[10px] text-[var(--t-text-4)] hover:text-[var(--t-text-3)]">更換</button>
                  </div>
                ) : (
                  <div>
                    <input value={custQ} onChange={e => setCustQ(e.target.value)} placeholder="搜尋姓名或電話"
                      className="w-full bg-transparent border-b border-[var(--t-border-s)] focus:border-[var(--t-accent)] focus:outline-none py-2 text-sm text-[var(--t-text)] placeholder:text-[var(--t-text-4)] transition-colors" />
                    {customers.length > 0 && !form.customerId && (
                      <div className="border border-[var(--t-border)] mt-1 max-h-36 overflow-auto bg-[var(--t-surface)]">
                        {customers.slice(0, 6).map(c => (
                          <button key={c.id} onClick={() => setForm(f => ({ ...f, customerId: c.id }))}
                            className="w-full text-left px-4 py-2.5 hover:bg-[var(--t-bg)] transition-colors border-b border-[var(--t-border)] last:border-0">
                            <p className="text-xs text-[var(--t-text)]">{c.name}</p>
                            <p className="text-[10px] text-[var(--t-text-4)]">{c.phone}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* Service */}
              <div>
                <label className="text-[10px] text-[var(--t-text-3)] tracking-[0.25em] uppercase mb-2 block">服務項目</label>
                <select value={form.serviceId} onChange={e => setForm(f => ({ ...f, serviceId: e.target.value }))}
                  className="w-full bg-transparent border-b border-[var(--t-border-s)] focus:border-[var(--t-accent)] focus:outline-none py-2 text-sm text-[var(--t-text)] transition-colors appearance-none cursor-pointer">
                  {services.map(s => <option key={s.id} value={s.id}>{s.name}（{s.durationMin}分　NT${s.price.toLocaleString()}）</option>)}
                </select>
              </div>
              {/* Date */}
              <div>
                <label className="text-[10px] text-[var(--t-text-3)] tracking-[0.25em] uppercase mb-2 block">日期</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full bg-transparent border-b border-[var(--t-border-s)] focus:border-[var(--t-accent)] focus:outline-none py-2 text-sm text-[var(--t-text)] transition-colors" />
              </div>
              {/* Time slots */}
              <div>
                <label className="text-[10px] text-[var(--t-text-3)] tracking-[0.25em] uppercase mb-3 block">時段</label>
                <div className="flex flex-wrap gap-2">
                  {slots.map(s => (
                    <button key={s} onClick={() => setForm(f => ({ ...f, time: s }))}
                      className={`px-3 py-1.5 text-[11px] border transition-colors ${
                        form.time === s
                          ? 'border-[var(--t-accent)] text-[var(--t-accent)] bg-[var(--t-accent-bg)]'
                          : 'border-[var(--t-border-s)] text-[var(--t-text-3)] hover:border-[var(--t-border-s)] hover:text-[var(--t-text-2)]'
                      }`}>{s}</button>
                  ))}
                </div>
              </div>
              {/* Note */}
              <div>
                <label className="text-[10px] text-[var(--t-text-3)] tracking-[0.25em] uppercase mb-2 block">備註</label>
                <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="選填"
                  className="w-full bg-transparent border-b border-[var(--t-border-s)] focus:border-[var(--t-accent)] focus:outline-none py-2 text-sm text-[var(--t-text)] placeholder:text-[var(--t-text-4)] transition-colors" />
              </div>
            </div>
            <button onClick={handleAdd} disabled={saving || !form.customerId || !form.serviceId || !form.date || !form.time}
              className="w-full mt-8 border border-[var(--t-accent)] text-[var(--t-accent)] hover:bg-[var(--t-accent)] hover:text-[var(--t-accent-fg)] disabled:opacity-40 py-2.5 text-[10px] tracking-[0.25em] uppercase transition-all duration-200">
              {saving ? '建立中' : '建立預約'}
            </button>
          </div>
        </div>
      )}

      {/* ── Payment modal ── */}
      {paying && selected && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--t-surface)] border border-[var(--t-border)] w-full max-w-xs p-8">
            <div className="flex items-center justify-between mb-6">
              <p className="text-[10px] tracking-[0.3em] text-[var(--t-text-2)] uppercase">結帳</p>
              <button onClick={() => setPaying(false)} className="text-[var(--t-text-4)] hover:text-[var(--t-text-2)] text-lg leading-none">×</button>
            </div>
            <p className="text-sm font-light text-[var(--t-text)] mb-0.5">{selected.customer.name}</p>
            <p className="text-xs text-[var(--t-text-3)] mb-6">{selected.service.name}</p>
            <div className="space-y-5">
              <div>
                <label className="text-[10px] text-[var(--t-text-3)] tracking-[0.25em] uppercase mb-2 block">金額（NT$）</label>
                <input type="number" value={payForm.total} onChange={e => setPayForm(f => ({ ...f, total: e.target.value }))}
                  className="w-full bg-transparent border-b border-[var(--t-border-s)] focus:border-[var(--t-accent)] focus:outline-none py-2 text-sm text-[var(--t-text)] transition-colors" />
              </div>
              <div>
                <label className="text-[10px] text-[var(--t-text-3)] tracking-[0.25em] uppercase mb-2 block">付款方式</label>
                <div className="flex flex-wrap gap-2">
                  {PAY_METHODS.map(m => (
                    <button key={m} onClick={() => setPayForm(f => ({ ...f, payMethod: m }))}
                      className={`px-3 py-1.5 text-[10px] tracking-wide border transition-colors ${
                        payForm.payMethod === m ? 'border-[var(--t-accent)] text-[var(--t-accent)]' : 'border-[var(--t-border-s)] text-[var(--t-text-3)]'
                      }`}>{m}</button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={handlePay} disabled={saving || !payForm.total}
              className="w-full mt-8 border border-[var(--t-accent)] text-[var(--t-accent)] hover:bg-[var(--t-accent)] hover:text-[var(--t-accent-fg)] disabled:opacity-40 py-2.5 text-[10px] tracking-[0.25em] uppercase transition-all duration-200">
              {saving ? '處理中' : '確認收款'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
