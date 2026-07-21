'use client'

import { useEffect, useState } from 'react'

type BusinessHours = { closedWeekdays: number[]; closedDates: string[]; openDates: string[] }
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export default function BusinessHoursCard() {
  const [hours, setHours] = useState<BusinessHours>({ closedWeekdays: [0], closedDates: [], openDates: [] })
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState('')
  const [newClosed, setNewClosed] = useState('')
  const [newOpen, setNewOpen] = useState('')

  useEffect(() => {
    fetch('/api/settings/business-hours')
      .then(r => r.json())
      .then((h: BusinessHours) => { if (h?.closedWeekdays) setHours(h) })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  function toggleWeekday(d: number) {
    setHours(h => ({
      ...h,
      closedWeekdays: h.closedWeekdays.includes(d)
        ? h.closedWeekdays.filter(x => x !== d)
        : [...h.closedWeekdays, d].sort(),
    }))
  }

  function addDate(kind: 'closedDates' | 'openDates', value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return
    setHours(h => (h[kind].includes(value) ? h : { ...h, [kind]: [...h[kind], value].sort() }))
  }
  function removeDate(kind: 'closedDates' | 'openDates', value: string) {
    setHours(h => ({ ...h, [kind]: h[kind].filter(d => d !== value) }))
  }

  async function save() {
    setSaving(true)
    const res = await fetch('/api/settings/business-hours', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(hours),
    })
    setSaving(false)
    if (res.ok) setSavedAt(new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }))
  }

  return (
    <div className="bg-[var(--t-surface)] border border-[var(--t-border)] mt-8">
      <div className="px-8 py-5 border-b border-[var(--t-border)]">
        <p className="text-[10px] tracking-[0.35em] text-[var(--t-text-2)] uppercase">營業與公休設定</p>
      </div>

      <div className="px-8 py-6 space-y-8">
        {/* 每週固定公休 */}
        <div>
          <p className="text-[10px] text-[var(--t-text-3)] tracking-[0.25em] uppercase mb-3">每週固定公休</p>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((label, d) => {
              const on = hours.closedWeekdays.includes(d)
              return (
                <button key={d} onClick={() => toggleWeekday(d)} disabled={!loaded}
                  className={`w-9 h-9 text-xs tracking-wide border transition-colors ${
                    on ? 'border-[var(--t-accent)] bg-[var(--t-accent)] text-[var(--t-accent-fg)]'
                       : 'border-[var(--t-border-s)] text-[var(--t-text-3)] hover:border-[var(--t-accent)]'
                  }`}>
                  {label}
                </button>
              )
            })}
          </div>
          <p className="text-[10px] text-[var(--t-text-4)] mt-2 tracking-wide">選取的星期將自動公休、不開放預約。</p>
        </div>

        {/* 臨時公休日 */}
        <DateList
          title="臨時公休日（例如國定假日、店休）"
          items={hours.closedDates}
          value={newClosed}
          onValue={setNewClosed}
          onAdd={() => { addDate('closedDates', newClosed); setNewClosed('') }}
          onRemove={v => removeDate('closedDates', v)}
        />

        {/* 特殊營業日 */}
        <DateList
          title="特殊營業日（覆蓋固定公休，該日照常營業）"
          items={hours.openDates}
          value={newOpen}
          onValue={setNewOpen}
          onAdd={() => { addDate('openDates', newOpen); setNewOpen('') }}
          onRemove={v => removeDate('openDates', v)}
        />

        <div className="flex items-center gap-4 pt-2">
          <button onClick={save} disabled={saving || !loaded}
            className="border border-[var(--t-accent)] text-[var(--t-accent)] hover:bg-[var(--t-accent)] hover:text-[var(--t-accent-fg)] disabled:opacity-40 px-6 py-2 text-[10px] tracking-[0.25em] uppercase transition-all">
            {saving ? '儲存中' : '儲存設定'}
          </button>
          {savedAt && <span className="text-[10px] text-[var(--t-text-4)] tracking-wide">已於 {savedAt} 儲存</span>}
        </div>
      </div>
    </div>
  )
}

function DateList({ title, items, value, onValue, onAdd, onRemove }: {
  title: string; items: string[]; value: string
  onValue: (v: string) => void; onAdd: () => void; onRemove: (v: string) => void
}) {
  return (
    <div>
      <p className="text-[10px] text-[var(--t-text-3)] tracking-[0.25em] uppercase mb-3">{title}</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {items.length === 0 && <span className="text-[10px] text-[var(--t-text-4)] tracking-wide">尚未設定</span>}
        {items.map(d => (
          <span key={d} className="inline-flex items-center gap-2 border border-[var(--t-accent-bg)] text-[var(--t-accent)] px-2.5 py-1 text-[11px] tracking-wide">
            {d}
            <button onClick={() => onRemove(d)} className="text-[var(--t-text-4)] hover:text-[#A05050] leading-none">×</button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <input type="date" value={value} onChange={e => onValue(e.target.value)}
          className="bg-transparent border-b border-[var(--t-border-s)] focus:border-[var(--t-accent)] focus:outline-none py-1.5 text-sm text-[var(--t-text)] transition-colors" />
        <button onClick={onAdd} disabled={!value}
          className="text-[10px] tracking-[0.2em] uppercase text-[var(--t-text-3)] hover:text-[var(--t-accent)] disabled:opacity-40 transition-colors">＋ 新增</button>
      </div>
    </div>
  )
}
