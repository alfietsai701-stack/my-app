import { Home, Calendar, Users, Droplet, Package, BarChart2, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Permissions } from '@/lib/permissions'

export type NavItem = { icon: LucideIcon; label: string; href: string; key: keyof Permissions }

// 側欄分兩組：每天都會用到的「日常」，與偶爾才進去的「店務」
export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: '日常',
    items: [
      { icon: Home,     label: '總覽', href: '/',             key: 'dashboard'    },
      { icon: Calendar, label: '預約', href: '/appointments', key: 'appointments' },
      { icon: Users,    label: '顧客', href: '/customers',    key: 'customers'    },
    ],
  },
  {
    label: '店務',
    items: [
      { icon: Droplet,   label: '服務', href: '/services',  key: 'services'  },
      { icon: Package,   label: '庫存', href: '/inventory', key: 'inventory' },
      { icon: BarChart2, label: '報表', href: '/reports',   key: 'reports'   },
      { icon: Settings,  label: '設定', href: '/settings',  key: 'settings'  },
    ],
  },
]

export function canSee(permissions: Permissions | null, key: keyof Permissions) {
  return !permissions || !!permissions[key]
}

// 「建立新預約」捷徑：帶 ?new=1 讓預約頁直接打開新增視窗
export const NEW_APPOINTMENT_HREF = '/appointments?new=1'

// 已經在預約頁時不需要換頁，發事件請預約頁直接打開新增視窗
export const NEW_APPOINTMENT_EVENT = 'ada:new-appointment'
export function handleNewAppointmentClick(e: { preventDefault: () => void }, pathname: string) {
  if (pathname !== '/appointments') return
  e.preventDefault()
  window.dispatchEvent(new Event(NEW_APPOINTMENT_EVENT))
}
