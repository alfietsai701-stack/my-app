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

export default function Sidebar({ permissions, userName, onNavigate }: { permissions: Permissions | null; userName: string; onNavigate?: () => void }) {
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
      <aside className="w-52 h-screen flex flex-col shrink-0 bg-[var(--t-sidebar)] border-r border-[var(--t-border)] overflow-y-auto">
        {/* Brand */}
        <div className="px-7 py-8">
          <p className="text-[9px] tracking-[0.35em] text-[var(--t-accent)] uppercase mb-1.5">Ada Studio</p>
          <h1 className="text-sm font-extralight text-[var(--t-text)] tracking-[0.2em]">慢療室</h1>
        </div>

        <div className="h-px bg-[var(--t-border)] mx-7" />

        {/* Nav */}
        <nav className="flex-1 px-4 py-5 space-y-0.5 overflow-y-auto">
          {visibleItems.map(({ icon: Icon, label, href }) => {
            const isActive = pathname === href
            return (
              <Link key={href} href={href} onClick={onNavigate}
                className={`flex items-center gap-3 px-3 py-2.5 text-xs tracking-wide transition-colors relative ${
                  isActive
                    ? 'text-[var(--t-accent)]'
                    : 'text-[var(--t-text-3)] hover:text-[var(--t-text-2)]'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-px h-4 bg-[var(--t-accent)]" />
                )}
                <Icon size={13} strokeWidth={isActive ? 1.75 : 1.5} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="h-px bg-[var(--t-border)] mx-7" />

        {/* Footer */}
        <div className="px-4 py-5">
          <div className="flex items-center justify-between px-3 mb-1">
            <p className="text-[10px] text-[var(--t-text-4)] tracking-wide truncate flex-1 mr-2">{userName}</p>
            <button onClick={toggle} className="text-[var(--t-text-4)] hover:text-[var(--t-accent)] transition-colors">
              {theme === 'light' ? <Moon size={12} strokeWidth={1.5} /> : <Sun size={12} strokeWidth={1.5} />}
            </button>
          </div>
          {[
            { icon: KeyRound, label: '修改密碼', onClick: () => setShowPwModal(true) },
            { icon: LogOut,   label: '登出',     onClick: handleLogout },
          ].map(({ icon: Icon, label, onClick }) => (
            <button key={label} onClick={onClick}
              className="flex items-center gap-3 w-full px-3 py-2 text-xs text-[var(--t-text-4)] hover:text-[var(--t-text-2)] tracking-wide transition-colors"
            >
              <Icon size={12} strokeWidth={1.5} />
              {label}
            </button>
          ))}
        </div>
      </aside>

      {showPwModal && (
        <Modal title="修改密碼" onClose={() => { setShowPwModal(false); setPwError('') }}>
          {[
            { label: '目前密碼', key: 'current' },
            { label: '新密碼',   key: 'next'    },
            { label: '確認新密碼', key: 'confirm' },
          ].map(({ label, key }) => (
            <div key={key} className="mb-5">
              <FieldLabel>{label}</FieldLabel>
              <input type="password"
                className="w-full bg-transparent border-b border-[var(--t-border-s)] focus:border-[var(--t-accent)] focus:outline-none py-2 text-sm text-[var(--t-text)] transition-colors"
                value={pwForm[key as keyof typeof pwForm]}
                onChange={(e) => setPwForm({ ...pwForm, [key]: e.target.value })}
              />
            </div>
          ))}
          {pwError && <p className="text-xs text-[#A05050] mb-4">{pwError}</p>}
          <OutlineBtn onClick={handleChangePassword} loading={pwSaving}>更新密碼</OutlineBtn>
        </Modal>
      )}
    </>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--t-surface)] border border-[var(--t-border)] w-full max-w-sm p-8">
        <div className="flex items-center justify-between mb-8">
          <p className="text-[10px] tracking-[0.3em] text-[var(--t-text-2)] uppercase">{title}</p>
          <button onClick={onClose} className="text-[var(--t-text-4)] hover:text-[var(--t-text-2)] text-lg leading-none transition-colors">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] text-[var(--t-text-3)] tracking-[0.25em] uppercase mb-2">{children}</p>
}

function OutlineBtn({ children, onClick, loading }: { children: React.ReactNode; onClick: () => void; loading: boolean }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="w-full border border-[var(--t-accent)] text-[var(--t-accent)] hover:bg-[var(--t-accent)] hover:text-[var(--t-accent-fg)] disabled:opacity-40 py-2.5 text-[10px] tracking-[0.25em] uppercase transition-all duration-200"
    >
      {loading ? '處理中' : children}
    </button>
  )
}
