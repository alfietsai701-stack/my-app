'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Users,
  Calendar,
  Scissors,
  Package,
  BarChart,
  Star,
} from 'lucide-react'

const navItems = [
  { icon: Home, label: '首頁', href: '/' },
  { icon: Users, label: '顧客', href: '/customers' },
  { icon: Calendar, label: '預約', href: '/appointments' },
  { icon: Scissors, label: '服務', href: '/services' },
  { icon: Package, label: '庫存', href: '/inventory' },
  { icon: BarChart, label: '報表', href: '/reports' },
  { icon: Star, label: '會員', href: '/members' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 h-screen bg-[#FDFCFA] border-r border-[#D6CFC4] flex flex-col shrink-0">
      <div className="p-6 border-b border-[#D6CFC4]">
        <h1 className="text-base font-medium text-[#2C2420]">Ada 慢療室</h1>
        <p className="text-xs text-[#A89990] mt-0.5">管理後台</p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(({ icon: Icon, label, href }) => {
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
    </aside>
  )
}
