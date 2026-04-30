'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, Users, Package, Settings } from 'lucide-react'
import Sidebar from './Sidebar'
import type { Permissions } from '@/lib/permissions'

// Bottom tab items for mobile (5 main items)
const BOTTOM_TABS = [
  { icon: Home,     label: '總覽', href: '/'             },
  { icon: Calendar, label: '預約', href: '/appointments' },
  { icon: Users,    label: '顧客', href: '/customers'    },
  { icon: Package,  label: '庫存', href: '/inventory'    },
  { icon: Settings, label: '設定', href: '/settings'     },
] as const

export default function ShellLayout({
  children,
  permissions,
  userName,
}: {
  children: React.ReactNode
  permissions: Permissions | null
  userName: string
}) {
  const pathname = usePathname()

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--t-bg)' }}>
      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <div className="hidden lg:flex shrink-0">
        <Sidebar permissions={permissions} userName={userName} />
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between px-4 h-14 shrink-0"
          style={{
            background: 'var(--t-surface)',
            borderBottom: '1px solid var(--t-border)',
            boxShadow: 'var(--t-shadow)',
          }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
              style={{ background: 'var(--t-accent)', fontSize: 14 }}>
              ✦
            </div>
            <span className="text-sm font-semibold" style={{ color: 'var(--t-text)' }}>美業管理後台</span>
          </div>
          <span className="text-xs font-medium" style={{ color: 'var(--t-text-4)' }}>後台管理系統</span>
        </div>

        {/* Page content — extra bottom padding on mobile for tab bar */}
        <div className="flex-1 overflow-hidden flex flex-col pb-0 lg:pb-0">
          <div className="flex-1 overflow-hidden flex flex-col" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            {children}
          </div>
        </div>

        {/* ── Mobile bottom tab bar ── */}
        <div className="lg:hidden shrink-0" style={{
          background: 'var(--t-surface)',
          borderTop: '1px solid var(--t-border)',
          boxShadow: '0 -4px 12px rgba(15,30,56,0.06)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          <div className="flex">
            {BOTTOM_TABS.map(({ icon: Icon, label, href }) => {
              const isActive = pathname === href
              return (
                <Link key={href} href={href}
                  className="flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-all"
                  style={{ color: isActive ? 'var(--t-accent)' : 'var(--t-text-4)' }}>
                  <Icon size={20} strokeWidth={isActive ? 2.2 : 1.75} />
                  <span className="text-[10px] font-medium">{label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
