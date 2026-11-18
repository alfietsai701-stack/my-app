'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

const FIELDS = [
  { label: '目前密碼',   key: 'current' },
  { label: '新密碼',     key: 'next'    },
  { label: '確認新密碼', key: 'confirm' },
] as const

export default function PasswordModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    setError('')
    if (form.next !== form.confirm) { setError('兩次新密碼不一致'); return }
    setSaving(true)
    const res = await fetch('/api/auth/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: form.current, newPassword: form.next }),
    })
    setSaving(false)
    if (res.ok) onClose()
    else { const d = await res.json(); setError(d.error ?? '發生錯誤') }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-ink/40"
      onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="pw-title"
        className="sheet-up w-full max-w-sm rounded-2xl bg-surface p-6"
        style={{ boxShadow: 'var(--t-shadow-md)' }}
        onClick={e => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 id="pw-title" className="text-lg text-ink">修改密碼</h2>
          <button onClick={onClose} aria-label="關閉"
            className="flex size-11 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted">
            <X size={18} />
          </button>
        </div>
        {FIELDS.map(({ label, key }) => (
          <div key={key} className="mb-4">
            <label htmlFor={`pw-${key}`} className="mb-1.5 block text-[13px] text-ink-muted">{label}</label>
            <input id={`pw-${key}`} type="password"
              className="h-[50px] w-full rounded-lg border border-border-input bg-[#F7F7F3] px-4 text-[15px] text-ink outline-none transition-colors focus:border-ink"
              value={form[key]}
              onChange={e => setForm({ ...form, [key]: e.target.value })}
            />
          </div>
        ))}
        {error && (
          <p role="alert" className="mb-4 rounded-lg px-4 py-2.5 text-[13px]"
            style={{ color: 'var(--t-danger)', background: 'var(--t-danger-bg)' }}>
            {error}
          </p>
        )}
        <button onClick={submit} disabled={saving}
          className="mt-1 h-[50px] w-full rounded-full bg-ink text-[15px] font-medium text-paper transition-colors hover:bg-ink-soft disabled:opacity-50">
          {saving ? '更新中…' : '確認更新'}
        </button>
      </div>
    </div>
  )
}
