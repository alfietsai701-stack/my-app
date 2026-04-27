import Sidebar from '@/components/layout/Sidebar'
import { getSession } from '@/lib/auth-server'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  return (
    <div className="flex h-screen bg-[var(--t-bg)] overflow-hidden">
      <Sidebar permissions={session?.permissions ?? null} userName={session?.name ?? ''} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">{children}</div>
    </div>
  )
}
