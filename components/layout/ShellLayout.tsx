'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import type { Permissions } from '@/lib/permissions'

export default function ShellLayout({
  children,
  permissions,
  userName,
}: {
  children: React.ReactNode
  permissions: Permissions | null
  userName: string
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-[var(--t-bg)] overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — always visible on lg+, drawer on mobile */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transition-transform duration-300 lg:static lg:translate-x-0 lg:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar
          permissions={permissions}
          userName={userName}
          onNavigate={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-4 px-5 h-12 border-b border-[var(--t-border)] bg-[var(--t-surface)] shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="text-[var(--t-text-3)] hover:text-[var(--t-text)] transition-colors">
            <Menu size={18} strokeWidth={1.5} />
          </button>
          <p className="text-[10px] tracking-[0.3em] text-[var(--t-accent)] uppercase">Ada Studio</p>
        </div>
        {children}
      </div>
    </div>
  )
}
