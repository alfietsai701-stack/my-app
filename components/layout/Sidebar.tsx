'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Home, Users, Calendar, Scissors, Package, BarChart, Star, Settings, LogOut, KeyRound } from 'lucide-react'
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

export default function Sidebar({
  permissions,
  userName,
}: {
  permissions: Permissions | null
  userName: string
}) {
  const pathname = usePathname()
  const router = useRouter()
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
    if (res.ok) {
      setShowPwModal(false)
      setPwForm({ current: '', next: '', confirm: '' })
    } else {
      const data = await res.json()
      setPwError(data.error ?? '發生錯誤')
    }
  }

  const visibleItems = NAV_ITEMS.filter(
    (item) => !permissions || permissions[item.key as keyof Permissions]
  )

  return (
    <>
      <aside className="w-56 h-screen bg-[#0D0D0F] border-r border-[#1E1E22] flex flex-col shrink-0">
        {/* Brand */}
        <div className="px-6 py-7 border-b border-[#1E1E22]">
          <p className="text-[9px] tracking-[0.3em] text-[#C9A96E] uppercase mb-1">Ada Studio</p>
          <h1 className="text-sm font-light text-[#F4F0E8] tracking-widest">慢療室</h1>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {visibleItems.map(({ icon: Icon, label, href }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={
                  isActive
                    ? 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium text-[#C9A96E] bg-[#C9A96E]/8 transition-colors'
                    : 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs text-[#6A6460] hover:text-[#A09890] hover:bg-[#18181B] transition-colors'
                }
              >
                <Icon size={14} strokeWidth={isActive ? 2 : 1.5} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-[#1E1E22]">
          <p className="text-[10px] text-[#3A3A40] px-3 mb-2 truncate">{userName}</p>
          <button
            onClick={() => setShowPwModal(true)}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-xs text-[#6A6460] hover:text-[#A09890] hover:bg-[#18181B] transition-colors"
          >
            <KeyRound size={14} strokeWidth={1.5} />
            修改密碼
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-xs text-[#6A6460] hover:text-[#A09890] hover:bg-[#18181B] transition-colors"
          >
            <LogOut size={14} strokeWidth={1.5} />
            登出
          </button>
        </div>
      </aside>

      {/* Change password modal */}
      {showPwModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111113] border border-[#2E2E33] rounded-2xl w-full max-w-sm p-7">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-medium text-[#F4F0E8] tracking-wide">修改密碼</h3>
              <button onClick={() => { setShowPwModal(false); setPwError('') }} className="text-[#3A3A40] hover:text-[#A09890] text-xl leading-none transition-colors">×</button>
            </div>
            {[
              { label: '目前密碼', key: 'current' },
              { label: '新密碼',   key: 'next'    },
              { label: '確認新密碼', key: 'confirm' },
            ].map(({ label, key }) => (
              <div key={key} className="mb-4">
                <label className="text-[10px] text-[#6A6460] tracking-widest uppercase mb-1.5 block">{label}</label>
                <input
                  type="password"
                  className="w-full bg-[#18181B] border border-[#2E2E33] focus:border-[#C9A96E] focus:outline-none rounded-xl px-4 py-2.5 text-sm text-[#F4F0E8] transition-colors"
                  value={pwForm[key as keyof typeof pwForm]}
                  onChange={(e) => setPwForm({ ...pwForm, [key]: e.target.value })}
                />
              </div>
            ))}
            {pwError && <p className="text-xs text-[#B57070] mb-4">{pwError}</p>}
            <button
              onClick={handleChangePassword}
              disabled={pwSaving}
              className="w-full bg-[#C9A96E] hover:bg-[#D4B87A] disabled:opacity-50 text-[#0D0D0F] rounded-xl py-2.5 text-xs font-medium tracking-wider mt-2 transition-colors"
            >
              {pwSaving ? '更新中...' : '更新密碼'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
