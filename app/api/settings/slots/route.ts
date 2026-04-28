import { NextRequest, NextResponse } from 'next/server'
import { getBusinessSlots } from '@/lib/slots'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const slots = await getBusinessSlots()
  return NextResponse.json({ slots })
}

export async function PATCH(req: NextRequest) {
  const { slots } = await req.json()
  if (!Array.isArray(slots)) return NextResponse.json({ error: 'invalid' }, { status: 400 })
  await prisma.setting.upsert({
    where:  { key: 'business_slots' },
    create: { key: 'business_slots', value: slots },
    update: { value: slots },
  })
  return NextResponse.json({ slots })
}
