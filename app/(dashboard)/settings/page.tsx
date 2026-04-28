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

  const togglePerm = (p: Permissions, k: keyof Permissions): Permissions => ({ ...p, [k]: !p[k] })

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <header className="h-14 border-b border-[var(--t-border)] bg-[var(--t-surface)] flex items-center justify-between px-8 shrink-0">
        <p className="text-[10px] tracking-[0.35em] text-[var(--t-text-3)] uppercase">系統設定</p>
        <button onClick={() => setAdding(true)}
          className="border border-[var(--t-accent)] text-[var(--t-accent)] hover:bg-[var(--t-accent)] hover:text-[var(--t-accent-fg)] px-5 py-1.5 text-[10px] tracking-[0.2em] uppercase transition-all duration-200">
          新增帳號
        </button>
      </header>

      <main className="flex-1 bg-[var(--t-bg)] p-8 overflow-auto">
        <div className="bg-[var(--t-surface)] border border-[var(--t-border)]">
          <div className="px-8 py-5 border-b border-[var(--t-border)]">
            <p className="text-[10px] tracking-[0.35em] text-[var(--t-text-2)] uppercase">管理員帳號</p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--t-border)]">
                {['姓名', '帳號', '功能權限', ''].map((h, i) => (
                  <th key={i} className="text-left text-[10px] font-normal text-[var(--t-text-4)] tracking-[0.25em] uppercase px-8 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-[var(--t-border)] last:border-0 hover:bg-[var(--t-bg)] transition-colors">
                  <td className="px-8 py-4 text-sm font-light text-[var(--t-text)] tracking-wide whitespace-nowrap">{u.name}</td>
                  <td className="px-8 py-4 text-xs text-[var(--t-text-3)] tracking-wide">{u.email}</td>
                  <td className="px-8 py-4">
                    <div className="flex flex-wrap gap-2">
                      {MODULES.filter(k => u.permissions[k]).map(k => (
                        <span key={k} className="border border-[var(--t-accent-bg)] text-[var(--t-accent)] px-2.5 py-0.5 text-[10px] tracking-wide">
                          {MODULE_LABELS[k]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-8 py-4 text-right whitespace-nowrap">
                    <button onClick={() => setEditing(u)} className="text-[10px] tracking-wide text-[var(--t-text-3)] hover:text-[var(--t-accent)] mr-5 transition-colors">編輯</button>
                    <button onClick={() => deleteUser(u.id, u.name)} className="text-[10px] tracking-wide text-[var(--t-text-3)] hover:text-[#A05050] transition-colors">刪除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {editing && (
        <Modal title={`編輯帳號`} onClose={() => setEditing(null)}>
          <FieldLabel>姓名</FieldLabel>
          <UnderlineInput value={editing.name} onChange={v => setEditing({ ...editing, name: v })} className="mb-6" />
          <FieldLabel>功能權限</FieldLabel>
          <div className="space-y-3 mb-8">
            {MODULES.map(k => <Check key={k} label={MODULE_LABELS[k]} checked={editing.permissions[k]} onChange={() => setEditing({ ...editing, permissions: togglePerm(editing.permissions, k) })} />)}
          </div>
          <OutlineBtn onClick={saveEdit} loading={saving}>儲存變更</OutlineBtn>
        </Modal>
      )}

      {adding && (
        <Modal title="新增帳號" onClose={() => setAdding(false)}>
          {([['name','姓名'],['email','帳號（Email）'],['password','初始密碼']] as const).map(([f, l]) => (
            <div key={f} className="mb-5">
              <FieldLabel>{l}</FieldLabel>
              <UnderlineInput type={f === 'password' ? 'password' : 'text'} value={newUser[f as 'name'|'email'|'password']} onChange={v => setNewUser({ ...newUser, [f]: v })} />
            </div>
          ))}
          <FieldLabel className="mt-6">功能權限</FieldLabel>
          <div className="space-y-3 mb-8">
            {MODULES.map(k => <Check key={k} label={MODULE_LABELS[k]} checked={newUser.permissions[k]} onChange={() => setNewUser({ ...newUser, permissions: togglePerm(newUser.permissions, k) })} />)}
          </div>
          <OutlineBtn onClick={addUser} loading={saving}>建立帳號</OutlineBtn>
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--t-surface)] border border-[var(--t-border)] w-full max-w-sm p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <p className="text-[10px] tracking-[0.3em] text-[var(--t-text-2)] uppercase">{title}</p>
          <button onClick={onClose} className="text-[var(--t-text-4)] hover:text-[var(--t-text-2)] text-lg leading-none transition-colors">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function FieldLabel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-[10px] text-[var(--t-text-3)] tracking-[0.25em] uppercase mb-2 ${className}`}>{children}</p>
}

function UnderlineInput({ value, onChange, type = 'text', className = '' }: { value: string; onChange: (v: string) => void; type?: string; className?: string }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      className={`w-full bg-transparent border-b border-[var(--t-border-s)] focus:border-[var(--t-accent)] focus:outline-none py-2 text-sm text-[var(--t-text)] transition-colors ${className}`}
    />
  )
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer" onClick={onChange}>
      <div className={`w-3.5 h-3.5 border flex items-center justify-center transition-colors flex-shrink-0 ${
        checked ? 'border-[var(--t-accent)] bg-[var(--t-accent)]' : 'border-[var(--t-border-s)]'
      }`}>
        {checked && <svg width="7" height="5" viewBox="0 0 7 5" fill="none"><path d="M1 2.5L2.8 4.2L6 1" stroke="var(--t-accent-fg)" strokeWidth="1.2" strokeLinecap="round"/></svg>}
      </div>
      <span className="text-xs text-[var(--t-text-2)] tracking-wide">{label}</span>
    </label>
  )
}

function OutlineBtn({ children, onClick, loading }: { children: React.ReactNode; onClick: () => void; loading: boolean }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="w-full border border-[var(--t-accent)] text-[var(--t-accent)] hover:bg-[var(--t-accent)] hover:text-[var(--t-accent-fg)] disabled:opacity-40 py-2.5 text-[10px] tracking-[0.25em] uppercase transition-all duration-200">
      {loading ? '處理中' : children}
    </button>
  )
}
