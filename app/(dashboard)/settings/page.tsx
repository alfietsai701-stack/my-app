'use client'

import { useEffect, useState } from 'react'
import { MODULE_LABELS, DEFAULT_PERMISSIONS } from '@/lib/permissions'
import type { Permissions } from '@/lib/permissions'

type AdminUser = { id: string; email: string; name: string; permissions: Permissions; createdAt: string }
const MODULES = Object.keys(DEFAULT_PERMISSIONS) as (keyof Permissions)[]

export default function SettingsPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [adding, setAdding] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', password: '', name: '', permissions: { ...DEFAULT_PERMISSIONS } })
  const [saving, setSaving] = useState(false)

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
    setSaving(true)
    const res = await fetch('/api/admin/accounts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    })
    setSaving(false)
    if (res.ok) { setAdding(false); setNewUser({ email: '', password: '', name: '', permissions: { ...DEFAULT_PERMISSIONS } }); load() }
  }

  async function deleteUser(id: string, name: string) {
    if (!confirm(`確定要刪除 ${name}？`)) return
    await fetch(`/api/admin/accounts/${id}`, { method: 'DELETE' }); load()
  }

  const togglePerm = (perms: Permissions, key: keyof Permissions): Permissions => ({ ...perms, [key]: !perms[key] })

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <header className="h-14 border-b border-[var(--t-border)] bg-[var(--t-surface)] flex items-center justify-between px-8 shrink-0">
        <h2 className="text-sm font-medium text-[var(--t-text)] tracking-wide">系統設定</h2>
        <button onClick={() => setAdding(true)}
          className="bg-[var(--t-gold)] hover:bg-[var(--t-gold-h)] text-[var(--t-gold-fg)] rounded-xl px-5 py-2 text-xs font-medium tracking-wider transition-colors">
          新增帳號
        </button>
      </header>

      <main className="flex-1 bg-[var(--t-bg)] p-8 overflow-auto">
        <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl overflow-hidden">
          <div className="px-7 py-5 border-b border-[var(--t-border)]">
            <h3 className="text-xs font-medium text-[var(--t-text)] tracking-widest uppercase">管理員帳號</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--t-border)]">
                {['姓名', '帳號', '功能權限', ''].map((h, i) => (
                  <th key={i} className="text-left text-[10px] font-medium text-[var(--t-text-4)] tracking-widest uppercase px-7 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-[var(--t-border)] last:border-0 hover:bg-[var(--t-elevated)] transition-colors">
                  <td className="px-7 py-4 text-sm text-[var(--t-text)] font-light whitespace-nowrap">{u.name}</td>
                  <td className="px-7 py-4 text-xs text-[var(--t-text-3)]">{u.email}</td>
                  <td className="px-7 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {MODULES.filter(k => u.permissions[k]).map(k => (
                        <span key={k} className="bg-[var(--t-gold-bg)] text-[var(--t-gold)] rounded-full px-2.5 py-0.5 text-[10px] tracking-wider">
                          {MODULE_LABELS[k]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-7 py-4 text-right whitespace-nowrap">
                    <button onClick={() => setEditing(u)} className="text-xs text-[var(--t-text-3)] hover:text-[var(--t-gold)] mr-4 transition-colors">編輯</button>
                    <button onClick={() => deleteUser(u.id, u.name)} className="text-xs text-[var(--t-text-3)] hover:text-[#B57070] transition-colors">刪除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {editing && (
        <Modal title={`編輯：${editing.name}`} onClose={() => setEditing(null)}>
          <Label>姓名</Label>
          <Inp value={editing.name} onChange={v => setEditing({ ...editing, name: v })} className="mb-5" />
          <Label>功能權限</Label>
          <div className="space-y-3 mb-6">
            {MODULES.map(k => <Check key={k} label={MODULE_LABELS[k]} checked={editing.permissions[k]} onChange={() => setEditing({ ...editing, permissions: togglePerm(editing.permissions, k) })} />)}
          </div>
          <GoldBtn onClick={saveEdit} loading={saving}>儲存</GoldBtn>
        </Modal>
      )}

      {adding && (
        <Modal title="新增帳號" onClose={() => setAdding(false)}>
          {([['name','姓名'],['email','帳號（Email）'],['password','初始密碼']] as const).map(([f, l]) => (
            <div key={f} className="mb-4">
              <Label>{l}</Label>
              <Inp type={f === 'password' ? 'password' : 'text'} value={newUser[f as 'name'|'email'|'password']} onChange={v => setNewUser({ ...newUser, [f]: v })} />
            </div>
          ))}
          <Label className="mt-5">功能權限</Label>
          <div className="space-y-3 mb-6">
            {MODULES.map(k => <Check key={k} label={MODULE_LABELS[k]} checked={newUser.permissions[k]} onChange={() => setNewUser({ ...newUser, permissions: togglePerm(newUser.permissions, k) })} />)}
          </div>
          <GoldBtn onClick={addUser} loading={saving}>建立帳號</GoldBtn>
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--t-surface)] border border-[var(--t-border-s)] rounded-2xl w-full max-w-sm p-7 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-medium text-[var(--t-text)] tracking-wide">{title}</h3>
          <button onClick={onClose} className="text-[var(--t-text-4)] hover:text-[var(--t-text-2)] text-xl leading-none transition-colors">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-[10px] text-[var(--t-text-3)] tracking-widest uppercase mb-1.5 ${className}`}>{children}</p>
}
function Inp({ value, onChange, type = 'text', className = '' }: { value: string; onChange: (v: string) => void; type?: string; className?: string }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      className={`w-full bg-[var(--t-elevated)] border border-[var(--t-border-s)] focus:border-[var(--t-gold)] focus:outline-none rounded-xl px-4 py-2.5 text-sm text-[var(--t-text)] transition-colors ${className}`}
    />
  )
}
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group" onClick={onChange}>
      <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors flex-shrink-0 ${checked ? 'bg-[var(--t-gold)] border-[var(--t-gold)]' : 'border-[var(--t-border-s)] group-hover:border-[var(--t-gold)]'}`}>
        {checked && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="var(--t-gold-fg)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>
      <span className="text-xs text-[var(--t-text-2)]">{label}</span>
    </label>
  )
}
function GoldBtn({ children, onClick, loading }: { children: React.ReactNode; onClick: () => void; loading: boolean }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="w-full bg-[var(--t-gold)] hover:bg-[var(--t-gold-h)] disabled:opacity-50 text-[var(--t-gold-fg)] rounded-xl py-2.5 text-xs font-medium tracking-wider transition-colors">
      {loading ? '處理中...' : children}
    </button>
  )
}
