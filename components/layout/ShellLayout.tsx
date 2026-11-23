'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { Home, Calendar, Users, Menu, Plus, KeyRound, Link2, LogOut, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Sidebar from './Sidebar'
import PasswordModal from './PasswordModal'
import LoginMethodsModal from './LoginMethodsModal'
import WhatsNewBanner from './WhatsNewBanner'
import { NAV_GROUPS, NEW_APPOINTMENT_HREF, canSee, handleNewAppointmentClick } from './nav-items'
import type { Permissions } from '@/lib/permissions'
import { APP_VERSION_LABEL } from '@/lib/version'

export default function ShellLayout({
  children,
  permissions,
  userName,
  showWhatsNew = false,
}: {
  children: React.ReactNode
  permissions: Permissions | null
  userName: string
  showWhatsNew?: boolean
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [showPw, setShowPw] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [showLoginMethods, setShowLoginMethods] = useState(false)

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  // 手機底部「更多」裡放店務頁面
  const moreItems = NAV_GROUPS[1].items.filter(i => canSee(permissions, i.key))
  const moreActive = moreItems.some(i => i.href === pathname)

  return (
    <div className="flex h-dvh overflow-hidden" style={{ background: 'var(--t-bg)' }}>
      {/* ── Desktop sidebar ── */}
      <div className="hidden shrink-0 lg:flex">
        <Sidebar permissions={permissions} userName={userName}
          onChangePassword={() => setShowPw(true)} onLoginMethods={() => setShowLoginMethods(true)} onLogout={handleLogout} />
      </div>

      {/* ── Main content ── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {showWhatsNew && <WhatsNewBanner userName={userName} />}
        <div className="flex flex-1 flex-col overflow-hidden">
          {children}
        </div>

        {/* ── Mobile bottom nav：膠囊列，中間是建立新預約 ── */}
        <div className="shrink-0 px-4 pt-2 lg:hidden"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
          <nav aria-label="主選單" className="flex items-center justify-around rounded-full bg-surface p-1.5 text-[11px]">
            {canSee(permissions, 'dashboard') && (
              <TabLink href="/" icon={Home} label="總覽" active={pathname === '/'} />
            )}
            {canSee(permissions, 'appointments') && (
              <TabLink href="/appointments" icon={Calendar} label="預約" active={pathname === '/appointments'} />
            )}
            {canSee(permissions, 'appointments') && (
              <Link href={NEW_APPOINTMENT_HREF} onClick={e => handleNewAppointmentClick(e, pathname)} aria-label="建立新預約"
                className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-ink text-paper transition-colors active:bg-ink-soft">
                <Plus size={22} strokeWidth={1.8} />
              </Link>
            )}
            {canSee(permissions, 'customers') && (
              <TabLink href="/customers" icon={Users} label="顧客" active={pathname === '/customers'} />
            )}
            <button onClick={() => setShowMore(true)} aria-haspopup="dialog" aria-expanded={showMore}
              className={`flex min-h-[52px] min-w-[52px] flex-1 flex-col items-center justify-center gap-[3px] ${
                moreActive ? 'font-bold text-ink' : 'text-ink-muted'
              }`}>
              <Menu size={20} strokeWidth={moreActive ? 2 : 1.6} />
              更多
            </button>
          </nav>
        </div>
      </div>

      {/* ── Mobile「更多」選單 ── */}
      {showMore && (
        <div className="fixed inset-0 z-40 flex items-end bg-ink/40 lg:hidden" onClick={() => setShowMore(false)}>
          <div role="dialog" aria-modal="true" aria-label="更多"
            className="sheet-up w-full rounded-t-3xl bg-surface px-4 pt-3"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-1 pl-3">
              <span className="text-[13px] text-ink-muted">{userName || '更多'}</span>
              <button onClick={() => setShowMore(false)} aria-label="關閉"
                className="flex size-11 items-center justify-center rounded-full text-ink-muted">
                <X size={18} />
              </button>
            </div>
            {moreItems.map(({ icon: Icon, label, href }) => (
              <Link key={href} href={href} onClick={() => setShowMore(false)}
                aria-current={pathname === href ? 'page' : undefined}
                className={`flex h-[52px] items-center gap-3.5 rounded-lg px-3 text-[15px] ${
                  pathname === href ? 'bg-sage-tint font-bold text-accent-foreground' : 'text-ink'
                }`}>
                <Icon size={19} strokeWidth={1.6} />{label}
              </Link>
            ))}
            <div className="mt-2 border-t border-line-soft pt-2">
              <button onClick={() => { setShowMore(false); setShowPw(true) }}
                className="flex h-[52px] w-full items-center gap-3.5 rounded-lg px-3 text-[15px] text-ink">
                <KeyRound size={19} strokeWidth={1.6} />修改密碼
              </button>
              <button onClick={() => { setShowMore(false); setShowLoginMethods(true) }}
                className="flex h-[52px] w-full items-center gap-3.5 rounded-lg px-3 text-[15px] text-ink">
                <Link2 size={19} strokeWidth={1.6} />登入方式
              </button>
              <button onClick={handleLogout}
                className="flex h-[52px] w-full items-center gap-3.5 rounded-lg px-3 text-[15px] text-ink">
                <LogOut size={19} strokeWidth={1.6} />登出
              </button>
            </div>
            <p className="px-3 pt-1 text-xs text-ink-muted">系統版本 {APP_VERSION_LABEL}</p>
          </div>
        </div>
      )}

      {showPw && <PasswordModal onClose={() => setShowPw(false)} />}
      {showLoginMethods && <LoginMethodsModal onClose={() => setShowLoginMethods(false)} />}
      <Suspense fallback={null}><LoginMethodsFromUrl /></Suspense>
    </div>
  )
}

/** 第三方綁定完成後會帶 ?login_methods=1 回來：自動打開「登入方式」顯示結果，關掉時把參數清掉 */
function LoginMethodsFromUrl() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  if (searchParams.get('login_methods') !== '1') return null

  const flash = { linked: searchParams.get('linked'), error: searchParams.get('oauth_error') }
  function close() {
    const rest = new URLSearchParams(searchParams.toString())
    for (const k of ['login_methods', 'linked', 'oauth_error']) rest.delete(k)
    const qs = rest.toString()
    router.replace(pathname + (qs ? `?${qs}` : ''), { scroll: false })
  }
  return <LoginMethodsModal flash={flash} onClose={close} />
}

function TabLink({ href, icon: Icon, label, active }: { href: string; icon: LucideIcon; label: string; active: boolean }) {
  return (
    <Link href={href} aria-current={active ? 'page' : undefined}
      className={`flex min-h-[52px] min-w-[52px] flex-1 flex-col items-center justify-center gap-[3px] ${
        active ? 'font-bold text-ink' : 'text-ink-muted'
      }`}>
      <Icon size={20} strokeWidth={active ? 2 : 1.6} />
      {label}
    </Link>
  )
}
