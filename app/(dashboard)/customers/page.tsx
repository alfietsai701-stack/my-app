import { prisma } from '@/lib/prisma'
import CustomersClient from './CustomersClient'

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { appointments: true } } },
  })
  return <CustomersClient initialCustomers={customers} />
}
