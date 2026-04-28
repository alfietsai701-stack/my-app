'use client'

import { useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus, Clock, User } from 'lucide-react'

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
  cancelled: { label: '已取消', style: 'text-[#A06060] border border-[rgba(160,96,96,0.2)]' },
}
const PAY_METHODS = ['現金', '信用卡', 'Line Pay', '轉帳']
const toDateStr = (d: Date) => d.toISOString().slice(0, 10)
const fmtDate = (d: Date) => d.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'short' })
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })

export default function AppointmentsPage() {
  const [date, setDate] = useState(toDateStr(new Date()))
  const [appts, setAppts]     = useState<Appt[]>([])
  const [selected, setSelected] = useState<Appt | null>(null)
  const [adding, setAdding]   = useState(false)
  const [paying, setPaying]   = useState(false)

  // New appointment form
  const [customers, setCustomers] = useState<Customer[]>([])
  const [services, setServices]   = useState<Service[]>([])
  const [custQ, setCustQ]         = useState('')
  const [form, setForm] = useState({ customerId: '', serviceId: '', date: '', time: '', note: '' })

  // Payment form
  const [payForm, setPayForm] = useState({ total: '', payMethod: PAY_METHODS[0] })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/appointments?date=${date}`)
    if (res.ok) setAppts(await res.json())
  }, [date])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    fetch('/api/services').then(r => r.ok ? r.json() : []).then(setServices)
  }, [])

  useEffect(() => {
    const t = setTimeout(async () => {
      const res = await fetch(`/api/customers?q=${encodeURIComponent(custQ)}`)
      if (res.ok) setCustomers(await res.json())
    }, 250)
    return () => clearTimeout(t)
  }, [custQ])

  function shiftDate(days: number) {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    setDate(toDateStr(d))
  }

  function openAdd() {
    setForm({ customerId: '', serviceId: services[0]?.id ?? '', date, time: '10:00', note: '' })
    setCustQ('')
    setAdding(true)
  }

  async function handleAdd() {
    if (!form.customerId || !form.serviceId || !form.date || !form.time) return
    setSaving(true)
    const scheduledAt = new Date(`${form.date}T${form.time}:00`).toISOString()
    await fetch('/api/appointments', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: form.customerId, serviceId: form.serviceId, scheduledAt, note: form.note }),
    })
    setSaving(false); setAdding(false); load()
  }

  async function handleStatus(id: string, status: string) {
    await fetch(`/api/appointments/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setSelected(prev => prev?.id === id ? { ...prev, status } : prev)
    load()
  }

  async function handlePay() {
    if (!selected) return
    setSaving(true)
    await fetch(`/api/appointments/${selected.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed', total: Number(payForm.total), payMethod: payForm.payMethod }),
    })
    setSaving(false); setPaying(false)
    const res = await fetch(`/api/appointments?date=${date}`)
    if (res.ok) {
      const updated: Appt[] = await res.json()
      setAppts(updated)
      setSelected(updated.find(a => a.id === selected.id) ?? null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('確定要刪除這筆預約？')) return
    await fetch(`/api/appointments/${id}`, { method: 'DELETE' })
    setSelected(null); load()
  }

  const selectedCustomer = customers.find(c => c.id === form.customerId)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-[var(--t-border)] bg-[var(--t-surface)] flex items-center justify-between px-4 lg:px-8 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => shiftDate(-1)} className="text-[var(--t-text-4)] hover:text-[var(--t-text-2)] transition-colors"><ChevronLeft size={16} strokeWidth={1.5} /></button>
          <button onClick={() => setDate(toDateStr(new Date()))}
            className="text-[10px] tracking-[0.25em] text-[var(--t-text-3)] hover:text-[var(--t-accent)] uppercase transition-colors min-w-[140px] text-center">
            {fmtDate(new Date(date + 'T00:00:00'))}
          </button>
          <button onClick={() => shiftDate(1)} className="text-[var(--t-text-4)] hover:text-[var(--t-text-2)] transition-colors"><ChevronRight size={16} strokeWidth={1.5} /></button>
          <button onClick={() => setDate(toDateStr(new Date()))}
            className="hidden sm:block text-[10px] tracking-[0.2em] text-[var(--t-text-4)] hover:text-[var(--t-accent)] uppercase transition-colors ml-2">今日</button>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 border border-[var(--t-accent)] text-[var(--t-accent)] hover:bg-[var(--t-accent)] hover:text-[var(--t-accent-fg)] px-4 lg:px-5 py-1.5 text-[10px] tracking-[0.2em] uppercase transition-all duration-200">
          <Plus size={11} /><span className="hidden sm:inline">新增預約</span><span className="sm:hidden">新增</span>
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Appointment list */}
        <div className={`flex flex-col overflow-hidden bg-[var(--t-bg)] ${selected ? 'hidden lg:flex lg:w-[55%] border-r border-[var(--t-border)]' : 'flex-1'}`}>
          <div className="flex-1 overflow-auto">
            {appts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <p className="text-xs text-[var(--t-text-3)] tracking-widest mb-2">今日無預約</p>
                <p className="text-[10px] text-[var(--t-text-4)] tracking-wide">點擊「新增預約」建立第一筆</p>
              </div>
            ) : (
              <div className="p-4 lg:p-6 space-y-3">
                {appts.map(a => (
                  <div key={a.id} onClick={() => setSelected(a)}
                    className={`bg-[var(--t-surface)] border cursor-pointer transition-colors p-5 ${
                      selected?.id === a.id ? 'border-[var(--t-accent)]' : 'border-[var(--t-border)] hover:border-[var(--t-border-s)]'
                    } ${a.status === 'cancelled' ? 'opacity-50' : ''}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Clock size={11} strokeWidth={1.5} className="text-[var(--t-text-4)]" />
                        <span className="text-xs text-[var(--t-text-3)] tabular-nums">{fmtTime(a.scheduledAt)}</span>
                        <span className="text-[10px] text-[var(--t-text-4)]">— {a.service.durationMin} 分</span>
                      </div>
                      <span className={`px-2.5 py-0.5 text-[10px] tracking-wide ${STATUS[a.status as keyof typeof STATUS]?.style}`}>
                        {STATUS[a.status as keyof typeof STATUS]?.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <User size={11} strokeWidth={1.5} className="text-[var(--t-text-4)]" />
                      <span className="text-sm font-light text-[var(--t-text)] tracking-wide">{a.customer.name}</span>
                    </div>
                    <p className="text-xs text-[var(--t-text-3)] tracking-wide ml-[19px]">{a.service.name}</p>
                    {a.note && <p className="text-[10px] text-[var(--t-text-4)] ml-[19px] mt-1.5">{a.note}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="px-6 py-3 border-t border-[var(--t-border)] bg-[var(--t-surface)] shrink-0">
            <p className="text-[10px] text-[var(--t-text-4)] tracking-wide">{appts.filter(a => a.status !== 'cancelled').length} 筆預約</p>
          </div>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="flex-1 flex flex-col overflow-hidden bg-[var(--t-bg)]">
            <div className="px-4 lg:px-8 py-4 border-b border-[var(--t-border)] bg-[var(--t-surface)] flex items-start justify-between shrink-0">
              <div>
                <p className="text-sm font-light text-[var(--t-text)] tracking-wide mb-0.5">{selected.customer.name}</p>
                <p className="text-[10px] text-[var(--t-text-4)] tracking-wide">{selected.customer.phone}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-[var(--t-text-4)] hover:text-[var(--t-text-2)] text-lg leading-none">×</button>
            </div>

            <div className="flex-1 overflow-auto p-4 lg:p-8 space-y-6">
              {/* Info */}
              <div className="bg-[var(--t-surface)] border border-[var(--t-border)] px-7 py-5 space-y-4">
                {[
                  ['服務',   selected.service.name],
                  ['時間',   `${fmtDate(new Date(selected.scheduledAt))}　${fmtTime(selected.scheduledAt)}`],
                  ['時長',   `${selected.service.durationMin} 分鐘`],
                  ['金額',   `NT$ ${selected.service.price.toLocaleString()}`],
                  ['備註',   selected.note || '—'],
                  ['狀態',   STATUS[selected.status as keyof typeof STATUS]?.label ?? selected.status],
                ].map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[80px_1fr] gap-2">
                    <p className="text-[10px] text-[var(--t-text-4)] tracking-[0.2em] uppercase pt-0.5">{label}</p>
                    <p className="text-xs text-[var(--t-text-2)] font-light">{value}</p>
                  </div>
                ))}
                {selected.receipt && (
                  <div className="grid grid-cols-[80px_1fr] gap-2 pt-2 border-t border-[var(--t-border)]">
                    <p className="text-[10px] text-[var(--t-text-4)] tracking-[0.2em] uppercase pt-0.5">付款</p>
                    <p className="text-xs text-[#6B9E78]">{selected.receipt.payMethod}　NT$ {selected.receipt.total.toLocaleString()}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              {selected.status === 'confirmed' && (
                <div className="space-y-3">
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

      {/* Add appointment modal */}
      {adding && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--t-surface)] border border-[var(--t-border)] w-full max-w-sm p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <p className="text-[10px] tracking-[0.3em] text-[var(--t-text-2)] uppercase">新增預約</p>
              <button onClick={() => setAdding(false)} className="text-[var(--t-text-4)] hover:text-[var(--t-text-2)] text-lg leading-none">×</button>
            </div>
            <div className="space-y-5">
              {/* Customer search */}
              <div>
                <label className="text-[10px] text-[var(--t-text-3)] tracking-[0.25em] uppercase mb-2 block">顧客</label>
                {selectedCustomer ? (
                  <div className="flex items-center justify-between border-b border-[var(--t-accent)] py-2">
                    <div>
                      <p className="text-sm text-[var(--t-text)]">{selectedCustomer.name}</p>
                      <p className="text-[10px] text-[var(--t-text-4)]">{selectedCustomer.phone}</p>
                    </div>
                    <button onClick={() => { setForm(f => ({ ...f, customerId: '' })); setCustQ('') }}
                      className="text-[10px] text-[var(--t-text-4)] hover:text-[var(--t-text-3)]">更換</button>
                  </div>
                ) : (
                  <div>
                    <input value={custQ} onChange={e => setCustQ(e.target.value)} placeholder="搜尋姓名或電話"
                      className="w-full bg-transparent border-b border-[var(--t-border-s)] focus:border-[var(--t-accent)] focus:outline-none py-2 text-sm text-[var(--t-text)] placeholder:text-[var(--t-text-4)] transition-colors" />
                    {customers.length > 0 && (
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
                  {services.map(s => <option key={s.id} value={s.id}>{s.name}（{s.durationMin} 分　NT$ {s.price.toLocaleString()}）</option>)}
                </select>
              </div>

              {/* Date + Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-[var(--t-text-3)] tracking-[0.25em] uppercase mb-2 block">日期</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full bg-transparent border-b border-[var(--t-border-s)] focus:border-[var(--t-accent)] focus:outline-none py-2 text-sm text-[var(--t-text)] transition-colors" />
                </div>
                <div>
                  <label className="text-[10px] text-[var(--t-text-3)] tracking-[0.25em] uppercase mb-2 block">時間</label>
                  <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                    className="w-full bg-transparent border-b border-[var(--t-border-s)] focus:border-[var(--t-accent)] focus:outline-none py-2 text-sm text-[var(--t-text)] transition-colors" />
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

      {/* Payment modal */}
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
