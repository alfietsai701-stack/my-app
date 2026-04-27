'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Home, Users, Calendar, Scissors, Package, BarChart, Star, Settings, LogOut, KeyRound } from 'lucide-react'
import type { Permissions } from '@/lib/permissions'

const NAV_ITEMS = [
  { icon: Home,     label: '首頁',   href: '/',            key: 'dashboard'    },
  { icon: Calendar, label: '預約',   href: '/appointments',key: 'appointments' },
  { icon: Users,    label: '顧客',   href: '/customers',   key: 'customers'    },
  { icon: Scissors, label: '服務',   href: '/services',    key: 'services'     },
  { icon: Package,  label: '庫存',   href: '/inventory',   key: 'inventory'    },
  { icon: BarChart, label: '報表',   href: '/reports',     key: 'reports'      },
  { icon: Star,     label: '會員',   href: '/members',     key: 'members'      },
  { icon: Settings, label: '系統設定',href: '/settings',   key: 'settings'     },
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
    <aside className="w-60 h-screen bg-[#FDFCFA] border-r border-[#D6CFC4] flex flex-col shrink-0">
      <div className="p-6 border-b border-[#D6CFC4]">
        <h1 className="text-base font-medium text-[#2C2420]">Ada 慢療室</h1>
        <p className="text-xs text-[#A89990] mt-0.5">管理後台</p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {visibleItems.map(({ icon: Icon, label, href }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={
                isActive
                  ? 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm bg-[#EDE8E0] text-[#2C2420] font-medium transition-colors'
                  : 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#6B5E54] hover:bg-[#F5F0E8] hover:text-[#2C2420] transition-colors'
              }
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-[#D6CFC4]">
        <p className="text-xs text-[#A89990] mb-2 px-1 truncate">{userName}</p>
        <button
          onClick={() => setShowPwModal(true)}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-[#6B5E54] hover:bg-[#F5F0E8] hover:text-[#2C2420] transition-colors"
        >
          <KeyRound size={16} />
          修改密碼
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-[#6B5E54] hover:bg-[#F5F0E8] hover:text-[#2C2420] transition-colors"
        >
          <LogOut size={16} />
          登出
        </button>
      </div>

      {showPwModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-[#FDFCFA] border border-[#D6CFC4] rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-medium text-[#2C2420]">修改密碼</h3>
              <button onClick={() => { setShowPwModal(false); setPwError('') }} className="text-[#A89990] hover:text-[#2C2420] text-lg leading-none">×</button>
            </div>
            {[
              { label: '目前密碼', key: 'current' },
              { label: '新密碼',   key: 'next'    },
              { label: '確認新密碼', key: 'confirm' },
            ].map(({ label, key }) => (
              <div key={key} className="mb-3">
                <label className="text-xs text-[#6B5E54] mb-1 block">{label}</label>
                <input
                  type="password"
                  className="w-full bg-[#EDE8E0] border border-[#D6CFC4] rounded-xl px-3 py-2 text-sm text-[#2C2420]"
                  value={pwForm[key as keyof typeof pwForm]}
                  onChange={(e) => setPwForm({ ...pwForm, [key]: e.target.value })}
                />
              </div>
            ))}
            {pwError && <p className="text-xs text-[#B56B6B] mb-3">{pwError}</p>}
            <button
              onClick={handleChangePassword}
              disabled={pwSaving}
              className="w-full bg-[#C9A87C] hover:bg-[#8B6347] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium mt-2"
            >
              {pwSaving ? '更新中...' : '更新密碼'}
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
