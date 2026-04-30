'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  Home, Users, Calendar, Scissors, Package, BarChart2,
  Star, Settings, LogOut, KeyRound, Sun, Moon, X,
} from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'
import type { Permissions } from '@/lib/permissions'

const NAV_ITEMS = [
  { icon: Home,     label: '總覽',    href: '/',             key: 'dashboard'    },
  { icon: Calendar, label: '預約',    href: '/appointments', key: 'appointments' },
  { icon: Users,    label: '顧客',    href: '/customers',    key: 'customers'    },
  { icon: Scissors, label: '服務',    href: '/services',     key: 'services'     },
  { icon: Package,  label: '庫存',    href: '/inventory',    key: 'inventory'    },
  { icon: BarChart2,label: '報表',    href: '/reports',      key: 'reports'      },
  { icon: Star,     label: '會員',    href: '/members',      key: 'members'      },
  { icon: Settings, label: '系統設定', href: '/settings',    key: 'settings'     },
] as const

export default function Sidebar({
  permissions, userName, onNavigate,
}: {
  permissions: Permissions | null
  userName: string
  onNavigate?: () => void
}) {
  const pathname  = usePathname()
  const router    = useRouter()
  const { theme, toggle } = useTheme()
  const [showPwModal, setShowPwModal] = useState(false)
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwError, setPwError] = useState('')
  const [pwSaving, setPwSaving] = useState(false)

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  async function handleChangePassword() {
    setPwError('')
    if (pwForm.next !== pwForm.confirm) { setPwError('兩次新密碼不一致'); return }
    setPwSaving(true)
    const res = await fetch('/api/auth/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
    })
    setPwSaving(false)
    if (res.ok) { setShowPwModal(false); setPwForm({ current: '', next: '', confirm: '' }) }
    else { const d = await res.json(); setPwError(d.error ?? '發生錯誤') }
  }

  const visibleItems = NAV_ITEMS.filter(item => !permissions || permissions[item.key as keyof Permissions])
  const initials = userName ? userName.slice(0, 2) : 'AD'

  return (
    <>
      <aside className="w-60 h-screen flex flex-col shrink-0 overflow-y-auto"
        style={{ background: 'var(--t-sidebar)', borderRight: '1px solid var(--t-border)' }}>

        {/* Brand */}
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
              style={{ background: 'var(--t-accent)' }}>
              A
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--t-text)' }}>Ada 慢療室</p>
              <p className="text-[11px]" style={{ color: 'var(--t-text-4)' }}>管理後台</p>
            </div>
          </div>
        </div>

        <div className="mx-4 h-px" style={{ background: 'var(--t-border)' }} />

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {visibleItems.map(({ icon: Icon, label, href }) => {
            const isActive = pathname === href
            return (
              <Link key={href} href={href} onClick={onNavigate}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
                style={isActive ? {
                  background: 'var(--t-accent)',
                  color: 'var(--t-accent-fg)',
                } : {
                  color: 'var(--t-text-3)',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--t-accent-bg)' }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '' }}
              >
                <Icon size={16} strokeWidth={isActive ? 2 : 1.75} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="mx-4 h-px" style={{ background: 'var(--t-border)' }} />

        {/* User footer */}
        <div className="px-3 py-4 space-y-1">
          {/* User row */}
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: 'var(--t-elevated)' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-semibold shrink-0"
              style={{ background: 'var(--t-accent)' }}>
              {initials}
            </div>
            <p className="text-xs font-medium flex-1 truncate" style={{ color: 'var(--t-text-2)' }}>{userName}</p>
            <button onClick={toggle}
              className="rounded-lg p-1 transition-colors"
              style={{ color: 'var(--t-text-4)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--t-accent)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--t-text-4)'}
              title={theme === 'light' ? '深色模式' : '淺色模式'}>
              {theme === 'light' ? <Moon size={13} strokeWidth={1.75} /> : <Sun size={13} strokeWidth={1.75} />}
            </button>
          </div>

          {[
            { icon: KeyRound, label: '修改密碼', onClick: () => setShowPwModal(true) },
            { icon: LogOut,   label: '登出',     onClick: handleLogout },
          ].map(({ icon: Icon, label, onClick }) => (
            <button key={label} onClick={onClick}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-xs transition-all duration-150"
              style={{ color: 'var(--t-text-4)' }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.background = 'var(--t-accent-bg)'
                el.style.color = 'var(--t-accent)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.background = ''
                el.style.color = 'var(--t-text-4)'
              }}
            >
              <Icon size={13} strokeWidth={1.75} />
              {label}
            </button>
          ))}
        </div>
      </aside>

      {/* Password modal */}
      {showPwModal && (
        <PwModal
          pwForm={pwForm}
          setPwForm={setPwForm}
          pwError={pwError}
          pwSaving={pwSaving}
          onClose={() => { setShowPwModal(false); setPwError('') }}
          onSubmit={handleChangePassword}
        />
      )}
    </>
  )
}

function PwModal({
  pwForm, setPwForm, pwError, pwSaving, onClose, onSubmit,
}: {
  pwForm: { current: string; next: string; confirm: string }
  setPwForm: (f: { current: string; next: string; confirm: string }) => void
  pwError: string
  pwSaving: boolean
  onClose: () => void
  onSubmit: () => void
}) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(15,30,56,0.35)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl p-6"
        style={{ background: 'var(--t-surface)', boxShadow: 'var(--t-shadow-md)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold" style={{ color: 'var(--t-text)' }}>修改密碼</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 transition-colors"
            style={{ color: 'var(--t-text-4)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--t-elevated)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
            <X size={16} />
          </button>
        </div>
        {[
          { label: '目前密碼', key: 'current' },
          { label: '新密碼',   key: 'next'    },
          { label: '確認新密碼', key: 'confirm' },
        ].map(({ label, key }) => (
          <div key={key} className="mb-4">
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--t-text-3)' }}>{label}</label>
            <input type="password"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
              style={{
                background: 'var(--t-elevated)',
                border: '1.5px solid var(--t-border)',
                color: 'var(--t-text)',
              }}
              onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--t-accent)'}
              onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--t-border)'}
              value={pwForm[key as keyof typeof pwForm]}
              onChange={(e) => setPwForm({ ...pwForm, [key]: e.target.value })}
            />
          </div>
        ))}
        {pwError && (
          <p className="text-xs mb-4 px-3 py-2 rounded-lg" style={{ color: 'var(--t-danger)', background: 'var(--t-danger-bg)' }}>
            {pwError}
          </p>
        )}
        <button onClick={onSubmit} disabled={pwSaving}
          className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 mt-2"
          style={{ background: 'var(--t-accent)', color: 'var(--t-accent-fg)' }}>
          {pwSaving ? '更新中…' : '確認更新'}
        </button>
      </div>
    </div>
  )
}
