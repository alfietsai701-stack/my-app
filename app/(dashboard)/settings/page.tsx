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

  function togglePerm(perms: Permissions, key: keyof Permissions) {
    return { ...perms, [key]: !perms[key] }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <header className="h-14 border-b border-[#D6CFC4] bg-[#FDFCFA] flex items-center justify-between px-6 shrink-0">
        <h2 className="text-base font-medium text-[#2C2420]">系統設定</h2>
        <button
          onClick={() => setAdding(true)}
          className="bg-[#C9A87C] hover:bg-[#8B6347] text-white rounded-xl px-5 py-2 text-sm font-medium transition-colors"
        >
          新增帳號
        </button>
      </header>

      <main className="flex-1 bg-[#F5F0E8] p-6 overflow-auto">
        <div className="bg-[#FDFCFA] border border-[#D6CFC4] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#D6CFC4]">
            <h3 className="text-base font-medium text-[#2C2420]">管理員帳號</h3>
          </div>

          <table className="w-full">
            <thead className="bg-[#EDE8E0]">
              <tr>
                <th className="text-left text-sm font-medium text-[#6B5E54] px-6 py-3">姓名</th>
                <th className="text-left text-sm font-medium text-[#6B5E54] px-6 py-3">帳號</th>
                <th className="text-left text-sm font-medium text-[#6B5E54] px-6 py-3">功能權限</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-[#D6CFC4]">
                  <td className="px-6 py-4 text-sm text-[#2C2420] font-medium whitespace-nowrap">{u.name}</td>
                  <td className="px-6 py-4 text-sm text-[#6B5E54]">{u.email}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {MODULES.filter((k) => u.permissions[k]).map((k) => (
                        <span key={k} className="bg-[#EDE8E0] text-[#6B5E54] rounded-full px-2.5 py-0.5 text-xs">
                          {MODULE_LABELS[k]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <button onClick={() => setEditing(u)} className="text-xs text-[#C9A87C] hover:text-[#8B6347] mr-3">編輯</button>
                    <button onClick={() => deleteUser(u.id, u.name)} className="text-xs text-[#B56B6B] hover:text-[#8B4444]">刪除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* 編輯 modal */}
      {editing && (
        <Modal title={`編輯：${editing.name}`} onClose={() => setEditing(null)}>
          <label className="text-xs text-[#6B5E54] mb-1 block">姓名</label>
          <input
            className="w-full bg-[#EDE8E0] border border-[#D6CFC4] rounded-xl px-3 py-2 text-sm text-[#2C2420] mb-4"
            value={editing.name}
            onChange={(e) => setEditing({ ...editing, name: e.target.value })}
          />
          <p className="text-xs text-[#6B5E54] mb-2">功能權限</p>
          <div className="space-y-2 mb-6">
            {MODULES.map((k) => (
              <label key={k} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.permissions[k]}
                  onChange={() => setEditing({ ...editing, permissions: togglePerm(editing.permissions, k) })}
                  className="accent-[#C9A87C]"
                />
                <span className="text-sm text-[#2C2420]">{MODULE_LABELS[k]}</span>
              </label>
            ))}
          </div>
          <button onClick={saveEdit} disabled={saving} className="w-full bg-[#C9A87C] hover:bg-[#8B6347] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium">
            {saving ? '儲存中...' : '儲存'}
          </button>
        </Modal>
      )}

      {/* 新增 modal */}
      {adding && (
        <Modal title="新增帳號" onClose={() => setAdding(false)}>
          {(['name', 'email', 'password'] as const).map((field) => (
            <div key={field} className="mb-3">
              <label className="text-xs text-[#6B5E54] mb-1 block">
                {{ name: '姓名', email: '帳號（Email）', password: '初始密碼' }[field]}
              </label>
              <input
                type={field === 'password' ? 'password' : 'text'}
                className="w-full bg-[#EDE8E0] border border-[#D6CFC4] rounded-xl px-3 py-2 text-sm text-[#2C2420]"
                value={newUser[field]}
                onChange={(e) => setNewUser({ ...newUser, [field]: e.target.value })}
              />
            </div>
          ))}
          <p className="text-xs text-[#6B5E54] mb-2 mt-4">功能權限</p>
          <div className="space-y-2 mb-6">
            {MODULES.map((k) => (
              <label key={k} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newUser.permissions[k]}
                  onChange={() => setNewUser({ ...newUser, permissions: togglePerm(newUser.permissions, k) })}
                  className="accent-[#C9A87C]"
                />
                <span className="text-sm text-[#2C2420]">{MODULE_LABELS[k]}</span>
              </label>
            ))}
          </div>
          <button onClick={addUser} disabled={saving} className="w-full bg-[#C9A87C] hover:bg-[#8B6347] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium">
            {saving ? '建立中...' : '建立帳號'}
          </button>
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-[#FDFCFA] border border-[#D6CFC4] rounded-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-medium text-[#2C2420]">{title}</h3>
          <button onClick={onClose} className="text-[#A89990] hover:text-[#2C2420] text-lg leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
