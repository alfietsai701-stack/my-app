import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const services = await prisma.service.findMany({
    select: { id: true, name: true, price: true, durationMin: true, category: true },
    orderBy: [{ category: 'asc' }, { price: 'asc' }],
  })

  const grouped: Record<string, typeof services> = {}
  for (const s of services) {
    if (!grouped[s.category]) grouped[s.category] = []
    grouped[s.category].push(s)
  }

  return NextResponse.json(grouped)
}
