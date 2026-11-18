import ShellLayout from '@/components/layout/ShellLayout'
import { getSession } from '@/lib/auth-server'
import { shouldShowWhatsNew } from '@/lib/whats-new'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  const showWhatsNew = session ? await shouldShowWhatsNew(session.id) : false
  return (
    <ShellLayout permissions={session?.permissions ?? null} userName={session?.name ?? ''} showWhatsNew={showWhatsNew}>
      {children}
    </ShellLayout>
  )
}
