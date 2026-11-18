'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { SettingsCard } from './SettingsCard'
import { btnPrimary, btnOutline, inputCls } from '@/components/ui/kit'

type BusinessHours = { closedWeekdays: number[]; closedDates: string[]; openDates: string[] }
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  const wd = WEEKDAYS[new Date(y, m - 1, d).getDay()]
  return `${m}/${d}（${wd}）`
}

export default function BusinessHoursCard({ className = '' }: { className?: string }) {
  const [hours, setHours] = useState<BusinessHours>({ closedWeekdays: [0], closedDates: [], openDates: [] })
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState('')
  const [dirty, setDirty] = useState(false)
  const [newClosed, setNewClosed] = useState('')
  const [newOpen, setNewOpen] = useState('')

  useEffect(() => {
    fetch('/api/settings/business-hours')
      .then(r => r.json())
      .then((h: BusinessHours) => { if (h?.closedWeekdays) setHours(h) })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  function update(fn: (h: BusinessHours) => BusinessHours) { setHours(fn); setDirty(true) }

  function toggleWeekday(d: number) {
    update(h => ({
      ...h,
      closedWeekdays: h.closedWeekdays.includes(d)
        ? h.closedWeekdays.filter(x => x !== d)
        : [...h.closedWeekdays, d].sort(),
    }))
  }
  function addDate(kind: 'closedDates' | 'openDates', value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return
    update(h => (h[kind].includes(value) ? h : { ...h, [kind]: [...h[kind], value].sort() }))
  }
  function removeDate(kind: 'closedDates' | 'openDates', value: string) {
    update(h => ({ ...h, [kind]: h[kind].filter(d => d !== value) }))
  }

  async function save() {
    setSaving(true)
    const res = await fetch('/api/settings/business-hours', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(hours),
    })
    setSaving(false)
    if (res.ok) {
      setDirty(false)
      setSavedAt(new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }))
    }
  }

  return (
    <SettingsCard title="營業日" hint="公休日客人不能預約" className={className}
      footer={<>
        <button onClick={save} disabled={saving || !loaded || !dirty} className={btnPrimary}>{saving ? '儲存中' : '儲存'}</button>
        <span className="text-xs text-ink-muted">{dirty ? '有尚未儲存的變更' : savedAt ? `已於 ${savedAt} 儲存` : ''}</span>
      </>}>
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-bold text-ink">每週固定公休</span>
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((label, d) => {
            const on = hours.closedWeekdays.includes(d)
            return (
              <button key={d} onClick={() => toggleWeekday(d)} disabled={!loaded} aria-pressed={on}
                aria-label={`週${label}${on ? '，公休' : '，營業'}`}
                className={`flex h-14 flex-col items-center justify-center rounded-lg text-sm transition-colors ${
                  on ? 'bg-ink text-paper' : 'border border-border-input text-ink hover:bg-surface-muted'
                }`}>
                {label}
                <span className={`text-[11px] ${on ? 'text-sage-soft' : 'text-ink-muted'}`}>{on ? '公休' : '營業'}</span>
              </button>
            )
          })}
        </div>
      </div>

      <DateList title="臨時公休日" hint="國定假日、進修、店休" items={hours.closedDates}
        value={newClosed} onValue={setNewClosed}
        onAdd={() => { addDate('closedDates', newClosed); setNewClosed('') }}
        onRemove={v => removeDate('closedDates', v)} />

      <DateList title="特殊營業日" hint="原本公休、這天照常營業" items={hours.openDates}
        value={newOpen} onValue={setNewOpen}
        onAdd={() => { addDate('openDates', newOpen); setNewOpen('') }}
        onRemove={v => removeDate('openDates', v)} />
    </SettingsCard>
  )
}

function DateList({ title, hint, items, value, onValue, onAdd, onRemove }: {
  title: string; hint: string; items: string[]; value: string
  onValue: (v: string) => void; onAdd: () => void; onRemove: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="flex items-baseline gap-2">
        <span className="text-[13px] font-bold text-ink">{title}</span>
        <span className="text-xs text-ink-muted">{hint}</span>
      </span>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map(d => (
            <span key={d} className="inline-flex h-9 items-center gap-1 rounded-full bg-surface-muted pl-3.5 pr-1 text-[13px] text-ink">
              {fmtDate(d)}
              <button onClick={() => onRemove(d)} aria-label={`移除 ${d}`}
                className="flex size-8 items-center justify-center rounded-full text-ink-muted hover:bg-line-soft hover:text-ink">
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <input type="date" value={value} onChange={e => onValue(e.target.value)} aria-label={`新增${title}`} className={`${inputCls} flex-1`} />
        <button onClick={onAdd} disabled={!value} className={btnOutline}>加入</button>
      </div>
    </div>
  )
}
