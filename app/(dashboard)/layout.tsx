import ShellLayout from '@/components/layout/ShellLayout'
import { getSession } from '@/lib/auth-server'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  return (
    <ShellLayout permissions={session?.permissions ?? null} userName={session?.name ?? ''}>
      {children}
    </ShellLayout>
  )
}
