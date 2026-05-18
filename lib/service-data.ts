import { revalidateTag, unstable_cache } from 'next/cache'
import { prisma } from './prisma'

export const SERVICES_CACHE_TAG = 'services'

export type PublicService = {
  id: string
  name: string
  price: number
  durationMin: number
  category: string
}

const getCachedServices = unstable_cache(
  async (): Promise<PublicService[]> => {
    return prisma.service.findMany({
      select: { id: true, name: true, price: true, durationMin: true, category: true },
      orderBy: [{ category: 'asc' }, { price: 'asc' }, { name: 'asc' }],
    })
  },
  ['services:list'],
  { tags: [SERVICES_CACHE_TAG], revalidate: 300 }
)

export async function getServices() {
  return getCachedServices()
}

export async function getGroupedBookServices() {
  const services = await getServices()
  const grouped: Record<string, PublicService[]> = {}

  for (const service of services) {
    if (!grouped[service.category]) grouped[service.category] = []
    grouped[service.category].push(service)
  }

  return grouped
}

export function revalidateServices() {
  revalidateTag(SERVICES_CACHE_TAG, 'max')
}
