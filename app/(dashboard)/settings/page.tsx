'use client'

import { useEffect, useState } from 'react'
import { MODULE_LABELS, DEFAULT_PERMISSIONS } from '@/lib/permissions'
import type { Permissions } from '@/lib/permissions'

type AdminUser = {
  id: string
  email: string
  name: string
  permissions: Permissions
  createdAt: string
}

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
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editing.name, permissions: editing.permissions }),
    })
    setSaving(false)
    setEditing(null)
    load()
  }

  async function addUser() {
    setSaving(true)
    const res = await fetch('/api/admin/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    })
    setSaving(false)
    if (res.ok) {
      setAdding(false)
      setNewUser({ email: '', password: '', name: '', permissions: { ...DEFAULT_PERMISSIONS } })
      load()
    }
  }

  async function deleteUser(id: string, name: string) {
    if (!confirm(`確定要刪除 ${name}？`)) return
    await fetch(`/api/admin/accounts/${id}`, { method: 'DELETE' })
    load()
  }

  function togglePerm(perms: Permissions, key: keyof Permissions): Permissions {
    return { ...perms, [key]: !perms[key] }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <header className="h-14 border-b border-[#1E1E22] bg-[#0D0D0F] flex items-center justify-between px-8 shrink-0">
        <h2 className="text-sm font-medium text-[#F4F0E8] tracking-wide">系統設定</h2>
        <button
          onClick={() => setAdding(true)}
          className="bg-[#C9A96E] hover:bg-[#D4B87A] text-[#0D0D0F] rounded-xl px-5 py-2 text-xs font-medium tracking-wider transition-colors"
        >
          新增帳號
        </button>
      </header>

      <main className="flex-1 bg-[#0D0D0F] p-8 overflow-auto">
        <div className="bg-[#111113] border border-[#1E1E22] rounded-2xl overflow-hidden">
          <div className="px-7 py-5 border-b border-[#1E1E22]">
            <h3 className="text-xs font-medium text-[#F4F0E8] tracking-widest uppercase">管理員帳號</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1A1A1D]">
                {['姓名', '帳號', '功能權限', ''].map((h, i) => (
                  <th key={i} className="text-left text-[10px] font-medium text-[#3A3A40] tracking-widest uppercase px-7 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-[#1A1A1D] last:border-0 hover:bg-[#18181B] transition-colors">
                  <td className="px-7 py-4 text-sm text-[#F4F0E8] font-light whitespace-nowrap">{u.name}</td>
                  <td className="px-7 py-4 text-xs text-[#6A6460]">{u.email}</td>
                  <td className="px-7 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {MODULES.filter((k) => u.permissions[k]).map((k) => (
                        <span key={k} className="bg-[#C9A96E]/8 text-[#C9A96E] rounded-full px-2.5 py-0.5 text-[10px] tracking-wider">
                          {MODULE_LABELS[k]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-7 py-4 text-right whitespace-nowrap">
                    <button onClick={() => setEditing(u)} className="text-xs text-[#6A6460] hover:text-[#C9A96E] mr-4 transition-colors">編輯</button>
                    <button onClick={() => deleteUser(u.id, u.name)} className="text-xs text-[#6A6460] hover:text-[#B57070] transition-colors">刪除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {editing && (
        <Modal title={`編輯：${editing.name}`} onClose={() => setEditing(null)}>
          <FieldLabel>姓名</FieldLabel>
          <Input
            value={editing.name}
            onChange={(v) => setEditing({ ...editing, name: v })}
            className="mb-5"
          />
          <FieldLabel>功能權限</FieldLabel>
          <div className="space-y-3 mb-6">
            {MODULES.map((k) => (
              <Checkbox
                key={k}
                label={MODULE_LABELS[k]}
                checked={editing.permissions[k]}
                onChange={() => setEditing({ ...editing, permissions: togglePerm(editing.permissions, k) })}
              />
            ))}
          </div>
          <GoldButton onClick={saveEdit} loading={saving}>儲存</GoldButton>
        </Modal>
      )}

      {adding && (
        <Modal title="新增帳號" onClose={() => setAdding(false)}>
          {([['name', '姓名'], ['email', '帳號（Email）'], ['password', '初始密碼']] as const).map(([field, label]) => (
            <div key={field} className="mb-4">
              <FieldLabel>{label}</FieldLabel>
              <Input
                type={field === 'password' ? 'password' : 'text'}
                value={newUser[field as 'name' | 'email' | 'password']}
                onChange={(v) => setNewUser({ ...newUser, [field]: v })}
              />
            </div>
          ))}
          <FieldLabel className="mt-5">功能權限</FieldLabel>
          <div className="space-y-3 mb-6">
            {MODULES.map((k) => (
              <Checkbox
                key={k}
                label={MODULE_LABELS[k]}
                checked={newUser.permissions[k]}
                onChange={() => setNewUser({ ...newUser, permissions: togglePerm(newUser.permissions, k) })}
              />
            ))}
          </div>
          <GoldButton onClick={addUser} loading={saving}>建立帳號</GoldButton>
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111113] border border-[#2E2E33] rounded-2xl w-full max-w-sm p-7 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-medium text-[#F4F0E8] tracking-wide">{title}</h3>
          <button onClick={onClose} className="text-[#3A3A40] hover:text-[#A09890] text-xl leading-none transition-colors">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function FieldLabel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-[10px] text-[#6A6460] tracking-widest uppercase mb-1.5 ${className}`}>{children}</p>
}

function Input({ value, onChange, type = 'text', className = '' }: { value: string; onChange: (v: string) => void; type?: string; className?: string }) {
  return (
    <input
      type={type}
      className={`w-full bg-[#18181B] border border-[#2E2E33] focus:border-[#C9A96E] focus:outline-none rounded-xl px-4 py-2.5 text-sm text-[#F4F0E8] transition-colors ${className}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <div
        onClick={onChange}
        className={`w-4 h-4 rounded flex items-center justify-center border transition-colors flex-shrink-0 ${checked ? 'bg-[#C9A96E] border-[#C9A96E]' : 'border-[#2E2E33] group-hover:border-[#C9A96E]/40'}`}
      >
        {checked && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="#0D0D0F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>
      <span className="text-xs text-[#A09890]">{label}</span>
    </label>
  )
}

function GoldButton({ children, onClick, loading }: { children: React.ReactNode; onClick: () => void; loading: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full bg-[#C9A96E] hover:bg-[#D4B87A] disabled:opacity-50 text-[#0D0D0F] rounded-xl py-2.5 text-xs font-medium tracking-wider transition-colors"
    >
      {loading ? '處理中...' : children}
    </button>
  )
}
