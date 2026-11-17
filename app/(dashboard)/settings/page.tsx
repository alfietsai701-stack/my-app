'use client'

import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { MODULE_LABELS, DEFAULT_PERMISSIONS } from '@/lib/permissions'
import { VISIT_LIGHT_DAYS, VISIT_LIGHT_LABEL, type VisitLightLevel } from '@/lib/visit-lights'
import type { Permissions } from '@/lib/permissions'
import BusinessHoursCard from './BusinessHoursCard'
import { SettingsCard } from './SettingsCard'
import {
  PageHeader, Tag, LightDot, Modal, FormField,
  btnPrimary, btnOutline, btnDanger, btnText, inputCls,
} from '@/components/ui/kit'

type AdminUser = { id: string; email: string; name: string; permissions: Permissions; createdAt: string }
const MODULES = Object.keys(DEFAULT_PERMISSIONS) as (keyof Permissions)[]
const LIGHT_LEVELS: VisitLightLevel[] = ['green', 'yellow', 'red']
const EMPTY_USER = { email: '', password: '', name: '', permissions: { ...DEFAULT_PERMISSIONS } }

export default function SettingsPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [adding, setAdding] = useState(false)
  const [newUser, setNewUser] = useState(EMPTY_USER)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const res = await fetch('/api/admin/accounts')
    if (res.ok) setUsers(await res.json())
  }
  useEffect(() => { load() }, [])

  async function saveEdit() {
    if (!editing) return
    setSaving(true)
    await fetch(`/api/admin/accounts/${editing.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editing.name, permissions: editing.permissions }),
    })
    setSaving(false); setEditing(null); load()
  }

  async function addUser() {
    setSaving(true); setError('')
    const res = await fetch('/api/admin/accounts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    })
    setSaving(false)
    if (res.ok) { setAdding(false); setNewUser(EMPTY_USER); load() }
    else setError((await res.json().catch(() => null))?.error ?? '建立失敗，請再試一次')
  }

  async function deleteUser(id: string, name: string) {
    if (!confirm(`確定要刪除 ${name}？`)) return
    await fetch(`/api/admin/accounts/${id}`, { method: 'DELETE' })
    setEditing(null); load()
  }

  const togglePerm = (p: Permissions, k: keyof Permissions): Permissions => ({ ...p, [k]: !p[k] })

  return (
    <div className="flex flex-1 flex-col overflow-hidden" style={{ background: 'var(--t-bg)' }}>
      <PageHeader title="設定" />

      <main className="flex-1 overflow-auto px-4 pb-4 pt-3 lg:px-5 lg:pb-5">
        {/* 左：營業日（佔兩列高）；右：可預約時段、回訪燈號；下：帳號橫跨整列 */}
        <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
          <BusinessHoursCard className="lg:row-span-2" />
          <SlotsCard />

          <SettingsCard title="回訪燈號" hint="顧客多久沒來，就在顧客頁亮燈提醒">
            <div className="flex flex-col">
              {LIGHT_LEVELS.map(level => (
                <div key={level} className="flex min-h-12 items-center justify-between gap-3 border-b border-line-soft text-sm last:border-0">
                  <span className="flex items-center gap-2.5 text-ink">
                    <LightDot level={level} size={14} />{VISIT_LIGHT_LABEL[level]}
                  </span>
                  <span className="text-ink-soft">超過 <span className="num text-xl font-semibold text-ink">{VISIT_LIGHT_DAYS[level]}</span> 天沒來</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-ink-muted">天數目前固定。之後需要可以改成在這裡調整。</p>
          </SettingsCard>

          <SettingsCard title="帳號" hint="誰可以登入後台、能看哪些頁面" className="lg:col-span-2"
            action={<button onClick={() => { setError(''); setNewUser(EMPTY_USER); setAdding(true) }} className={btnOutline}>
              <Plus size={16} strokeWidth={1.8} />新增帳號
            </button>}>
            <div className="flex flex-col">
              {users.length === 0 && <p className="py-2 text-[13px] text-ink-muted">載入中…</p>}
              {users.map(u => (
                <div key={u.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line-soft py-3 last:border-0">
                  <span className="flex min-w-[160px] flex-col gap-0.5">
                    <span className="text-[15px] font-medium text-ink">{u.name}</span>
                    <span className="text-xs text-ink-muted">{u.email}</span>
                  </span>
                  <span className="flex flex-1 flex-wrap gap-1.5">
                    {MODULES.filter(k => u.permissions[k]).map(k => <Tag key={k} kind="sage">{MODULE_LABELS[k]}</Tag>)}
                  </span>
                  <button onClick={() => setEditing(u)} className={btnText}>編輯</button>
                </div>
              ))}
            </div>
          </SettingsCard>
        </div>
      </main>

      {editing && (
        <Modal title="編輯帳號" onClose={() => setEditing(null)}
          footer={<>
            <button onClick={() => deleteUser(editing.id, editing.name)} className={btnDanger}>刪除</button>
            <button onClick={saveEdit} disabled={saving} className={`${btnPrimary} h-[50px] flex-1`}>{saving ? '儲存中' : '儲存變更'}</button>
          </>}>
          <FormField label="姓名" htmlFor="acc-name">
            <input id="acc-name" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className={inputCls} />
          </FormField>
          <PermissionPicker value={editing.permissions} onToggle={k => setEditing({ ...editing, permissions: togglePerm(editing.permissions, k) })} />
        </Modal>
      )}

      {adding && (
        <Modal title="新增帳號" onClose={() => setAdding(false)}
          footer={<button onClick={addUser} disabled={saving || !newUser.email || !newUser.password || !newUser.name}
            className={`${btnPrimary} h-[50px] flex-1`}>{saving ? '建立中' : '建立帳號'}</button>}>
          {([['name', '姓名', 'text'], ['email', '帳號（Email）', 'email'], ['password', '初始密碼', 'password']] as const).map(([f, l, type]) => (
            <FormField key={f} label={l} htmlFor={`acc-new-${f}`}>
              <input id={`acc-new-${f}`} type={type} value={newUser[f]} onChange={e => setNewUser({ ...newUser, [f]: e.target.value })} className={inputCls} />
            </FormField>
          ))}
          <PermissionPicker value={newUser.permissions} onToggle={k => setNewUser({ ...newUser, permissions: togglePerm(newUser.permissions, k) })} />
          {error && <p role="alert" className="rounded-lg bg-visit-red-bg px-3.5 py-2.5 text-[13px] text-visit-red-ink">{error}</p>}
        </Modal>
      )}
    </div>
  )
}

function PermissionPicker({ value, onToggle }: { value: Permissions; onToggle: (k: keyof Permissions) => void }) {
  return (
    <FormField label="可以使用的頁面">
      <div className="flex flex-wrap gap-2">
        {MODULES.map(k => {
          const on = value[k]
          return (
            <button key={k} type="button" onClick={() => onToggle(k)} aria-pressed={on}
              className={`h-11 rounded-full px-4 text-[13px] transition-colors ${
                on ? 'bg-ink text-paper' : 'border border-border-input text-ink hover:bg-surface-muted'
              }`}>
              {MODULE_LABELS[k]}
            </button>
          )
        })}
      </div>
    </FormField>
  )
}

/** 可預約時段：客人在預約頁能選的開始時間 */
function SlotsCard() {
  const [slots, setSlots] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)
  const [newSlot, setNewSlot] = useState('')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/settings/slots')
      .then(r => r.json())
      .then((d: { slots?: string[] }) => { if (Array.isArray(d?.slots)) setSlots(d.slots) })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  function add() {
    if (!/^\d{2}:\d{2}$/.test(newSlot) || slots.includes(newSlot)) { setNewSlot(''); return }
    setSlots(s => [...s, newSlot].sort()); setNewSlot(''); setDirty(true); setMessage('')
  }
  function remove(t: string) { setSlots(s => s.filter(x => x !== t)); setDirty(true); setMessage('') }

  async function save() {
    setSaving(true)
    const res = await fetch('/api/settings/slots', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slots }),
    })
    setSaving(false)
    if (res.ok) { setDirty(false); setMessage('已儲存') }
    else setMessage((await res.json().catch(() => null))?.error ?? '儲存失敗')
  }

  return (
    <SettingsCard title="可預約時段" hint="客人在預約頁能選的開始時間"
      footer={<>
        <button onClick={save} disabled={saving || !dirty} className={btnPrimary}>{saving ? '儲存中' : '儲存'}</button>
        <span className="text-xs text-ink-muted">{dirty ? '有尚未儲存的變更' : message}</span>
      </>}>
      {!loaded ? (
        <p className="text-[13px] text-ink-muted">載入中…</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {slots.length === 0 && <span className="text-[13px] text-ink-muted">還沒有設定時段。</span>}
          {slots.map(t => (
            <span key={t} className="inline-flex h-10 items-center gap-0.5 rounded-full bg-surface-muted pl-3.5 pr-1">
              <span className="num text-lg font-semibold text-ink">{t}</span>
              <button onClick={() => remove(t)} aria-label={`移除 ${t}`}
                className="flex size-8 items-center justify-center rounded-full text-ink-muted hover:bg-line-soft hover:text-ink">
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <input type="time" step={1800} value={newSlot} onChange={e => setNewSlot(e.target.value)}
          aria-label="新增時段" className={`${inputCls} flex-1`} />
        <button onClick={add} disabled={!newSlot} className={btnOutline}>加入</button>
      </div>
    </SettingsCard>
  )
}
