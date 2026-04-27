'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Home, Users, Calendar, Scissors, Package, BarChart, Star, Settings, LogOut, KeyRound, Sun, Moon } from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'
import type { Permissions } from '@/lib/permissions'

const NAV_ITEMS = [
  { icon: Home,     label: '首頁',    href: '/',             key: 'dashboard'    },
  { icon: Calendar, label: '預約',    href: '/appointments', key: 'appointments' },
  { icon: Users,    label: '顧客',    href: '/customers',    key: 'customers'    },
  { icon: Scissors, label: '服務',    href: '/services',     key: 'services'     },
  { icon: Package,  label: '庫存',    href: '/inventory',    key: 'inventory'    },
  { icon: BarChart, label: '報表',    href: '/reports',      key: 'reports'      },
  { icon: Star,     label: '會員',    href: '/members',      key: 'members'      },
  { icon: Settings, label: '系統設定', href: '/settings',    key: 'settings'     },
] as const

export default function Sidebar({ permissions, userName }: { permissions: Permissions | null; userName: string }) {
  const pathname = usePathname()
  const router = useRouter()
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

  return (
    <>
      <aside className="w-56 h-screen flex flex-col shrink-0 bg-[var(--t-surface)] border-r border-[var(--t-border)]">
        {/* Brand */}
        <div className="px-6 py-7 border-b border-[var(--t-border)]">
          <p className="text-[9px] tracking-[0.3em] text-[var(--t-gold)] uppercase mb-1">Ada Studio</p>
          <h1 className="text-sm font-light text-[var(--t-text)] tracking-widest">慢療室</h1>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {visibleItems.map(({ icon: Icon, label, href }) => {
            const isActive = pathname === href
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs transition-colors ${
                  isActive
                    ? 'font-medium text-[var(--t-gold)] bg-[var(--t-gold-bg)]'
                    : 'text-[var(--t-text-3)] hover:text-[var(--t-text-2)] hover:bg-[var(--t-elevated)]'
                }`}
              >
                <Icon size={14} strokeWidth={isActive ? 2 : 1.5} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-[var(--t-border)]">
          <div className="flex items-center justify-between px-3 mb-2">
            <p className="text-[10px] text-[var(--t-text-4)] truncate flex-1 mr-2">{userName}</p>
            <button onClick={toggle} className="text-[var(--t-text-4)] hover:text-[var(--t-gold)] transition-colors flex-shrink-0">
              {theme === 'dark' ? <Sun size={13} strokeWidth={1.5} /> : <Moon size={13} strokeWidth={1.5} />}
            </button>
          </div>
          {[
            { icon: KeyRound, label: '修改密碼', onClick: () => setShowPwModal(true) },
            { icon: LogOut,   label: '登出',     onClick: handleLogout },
          ].map(({ icon: Icon, label, onClick }) => (
            <button key={label} onClick={onClick}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-xs text-[var(--t-text-3)] hover:text-[var(--t-text-2)] hover:bg-[var(--t-elevated)] transition-colors"
            >
              <Icon size={14} strokeWidth={1.5} />
              {label}
            </button>
          ))}
        </div>
      </aside>

      {showPwModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--t-surface)] border border-[var(--t-border-s)] rounded-2xl w-full max-w-sm p-7">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-medium text-[var(--t-text)] tracking-wide">修改密碼</h3>
              <button onClick={() => { setShowPwModal(false); setPwError('') }} className="text-[var(--t-text-4)] hover:text-[var(--t-text-2)] text-xl leading-none transition-colors">×</button>
            </div>
            {[
              { label: '目前密碼', key: 'current' },
              { label: '新密碼',   key: 'next'    },
              { label: '確認新密碼', key: 'confirm' },
            ].map(({ label, key }) => (
              <div key={key} className="mb-4">
                <label className="text-[10px] text-[var(--t-text-3)] tracking-widest uppercase mb-1.5 block">{label}</label>
                <input type="password"
                  className="w-full bg-[var(--t-elevated)] border border-[var(--t-border-s)] focus:border-[var(--t-gold)] focus:outline-none rounded-xl px-4 py-2.5 text-sm text-[var(--t-text)] transition-colors"
                  value={pwForm[key as keyof typeof pwForm]}
                  onChange={(e) => setPwForm({ ...pwForm, [key]: e.target.value })}
                />
              </div>
            ))}
            {pwError && <p className="text-xs text-[#B57070] mb-4">{pwError}</p>}
            <button onClick={handleChangePassword} disabled={pwSaving}
              className="w-full mt-2 bg-[var(--t-gold)] hover:bg-[var(--t-gold-h)] disabled:opacity-50 text-[var(--t-gold-fg)] rounded-xl py-2.5 text-xs font-medium tracking-wider transition-colors"
            >
              {pwSaving ? '更新中...' : '更新密碼'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
