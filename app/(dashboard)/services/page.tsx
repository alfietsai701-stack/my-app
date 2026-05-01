import { prisma } from '@/lib/prisma'
import ServicesClient from './ServicesClient'

export default async function ServicesPage() {
  const services = await prisma.service.findMany({
    orderBy: [{ category: 'asc' }, { price: 'asc' }],
  })
  return <ServicesClient initialServices={services} />
}
