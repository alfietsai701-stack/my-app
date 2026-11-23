'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { KeyRound, Link2, LogOut, Plus } from 'lucide-react'
import type { Permissions } from '@/lib/permissions'
import { APP_VERSION_LABEL } from '@/lib/version'
import { NAV_GROUPS, NEW_APPOINTMENT_HREF, canSee, handleNewAppointmentClick } from './nav-items'

export default function Sidebar({
  permissions, userName, onChangePassword, onLoginMethods, onLogout,
}: {
  permissions: Permissions | null
  userName: string
  onChangePassword: () => void
  onLoginMethods: () => void
  onLogout: () => void
}) {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col gap-[18px] overflow-y-auto px-4 py-5"
      style={{ background: 'var(--t-sidebar)' }}>

      {/* Brand */}
      <Link href="/" className="flex items-center gap-1.5">
        <Image src="/logo.png" alt="Ada 慢療室" width={52} height={52} priority />
        <span className="font-heading text-base font-semibold tracking-[0.25em] text-ink">慢療室</span>
      </Link>

      {canSee(permissions, 'appointments') && (
        <Link href={NEW_APPOINTMENT_HREF} onClick={e => handleNewAppointmentClick(e, pathname)}
          className="flex h-[46px] shrink-0 items-center justify-center gap-1.5 rounded-lg bg-ink text-sm font-medium tracking-wider text-paper transition-colors hover:bg-ink-soft">
          <Plus size={16} strokeWidth={1.8} />建立新預約
        </Link>
      )}

      {/* Nav */}
      <nav aria-label="主選單" className="flex flex-1 flex-col gap-0.5 text-sm">
        {NAV_GROUPS.map((group, gi) => {
          const items = group.items.filter(i => canSee(permissions, i.key))
          if (items.length === 0) return null
          return (
            <div key={group.label} className="flex flex-col gap-0.5">
              <span className={`px-3 pb-1 text-xs text-ink-muted ${gi === 0 ? 'pt-1' : 'pt-3.5'}`}>{group.label}</span>
              {items.map(({ icon: Icon, label, href }) => {
                const isActive = pathname === href
                return (
                  <Link key={href} href={href} aria-current={isActive ? 'page' : undefined}
                    className={`flex h-11 items-center gap-3 rounded-md px-3 transition-colors ${
                      isActive
                        ? 'bg-sage-tint font-bold text-accent-foreground'
                        : 'text-ink hover:bg-surface-muted'
                    }`}>
                    <Icon size={18} strokeWidth={isActive ? 2 : 1.6} />
                    {label}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="flex flex-col gap-0.5 border-t border-line pt-3 text-[13px]">
        {userName && <p className="truncate px-3 pb-1 text-ink-muted">{userName}</p>}
        <button onClick={onChangePassword}
          className="flex h-11 items-center gap-3 rounded-md px-3 text-ink transition-colors hover:bg-surface-muted">
          <KeyRound size={16} strokeWidth={1.6} />修改密碼
        </button>
        <button onClick={onLoginMethods}
          className="flex h-11 items-center gap-3 rounded-md px-3 text-ink transition-colors hover:bg-surface-muted">
          <Link2 size={16} strokeWidth={1.6} />登入方式
        </button>
        <button onClick={onLogout}
          className="flex h-11 items-center gap-3 rounded-md px-3 text-ink transition-colors hover:bg-surface-muted">
          <LogOut size={16} strokeWidth={1.6} />登出
        </button>
        <p className="px-3 pt-2 text-xs text-ink-muted" title="系統版本">系統版本 {APP_VERSION_LABEL}</p>
      </div>
    </aside>
  )
}
