import { prisma } from '@/lib/prisma'
import { serializeCustomer } from '@/lib/customer-serializers'
import CustomersClient from './CustomersClient'

type LastVisitRow = { customerId: string; _max: { scheduledAt: Date | null } }

export default async function CustomersPage() {
  const now = new Date()
  const [customers, lastVisitRows] = await Promise.all([
    prisma.customer.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { appointments: true } } },
    }),
    // 每位顧客最近一次（未取消、已發生）的預約時間，用來算回訪燈號
    prisma.appointment.groupBy({
      by: ['customerId'],
      where: { status: { not: 'cancelled' }, scheduledAt: { lte: now } },
      _max: { scheduledAt: true },
    }),
  ])

  const lastVisits: Record<string, string> = {}
  for (const row of lastVisitRows as LastVisitRow[]) {
    if (row._max.scheduledAt) lastVisits[row.customerId] = row._max.scheduledAt.toISOString()
  }

  return <CustomersClient initialCustomers={customers.map(serializeCustomer)} lastVisits={lastVisits} />
}
