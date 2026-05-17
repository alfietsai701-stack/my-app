import { prisma } from '@/lib/prisma'
import { serializeCustomer } from '@/lib/customer-serializers'
import CustomersClient from './CustomersClient'

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { appointments: true } } },
  })
  return <CustomersClient initialCustomers={customers.map(serializeCustomer)} />
}
