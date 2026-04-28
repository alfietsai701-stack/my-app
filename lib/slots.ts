import { prisma } from './prisma'

const DEFAULT_SLOTS = ['10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00']

export async function getBusinessSlots(): Promise<string[]> {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'business_slots' } })
    if (setting?.value) return setting.value as string[]
  } catch {}
  return DEFAULT_SLOTS
}
