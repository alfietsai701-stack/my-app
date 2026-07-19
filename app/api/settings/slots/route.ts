import { NextRequest, NextResponse } from 'next/server'
import { getBusinessSlots } from '@/lib/slots'
import { prisma } from '@/lib/prisma'
import { withAuth, withPermission } from '@/lib/with-auth'

export const GET = withAuth(async () => {
  const slots = await getBusinessSlots()
  return NextResponse.json({ slots })
})

const TIME_RE = /^\d{2}:\d{2}$/

export const PATCH = withPermission('settings', async (req: NextRequest) => {
  const { slots } = await req.json()
  if (!Array.isArray(slots)) {
    return NextResponse.json({ error: 'slots 必須為陣列' }, { status: 400 })
  }
  const invalid = slots.filter((s: unknown) => typeof s !== 'string' || !TIME_RE.test(s))
  if (invalid.length > 0) {
    return NextResponse.json({ error: `時段格式錯誤，須為 HH:MM：${invalid.join('、')}` }, { status: 400 })
  }
  await prisma.setting.upsert({
    where:  { key: 'business_slots' },
    create: { key: 'business_slots', value: slots },
    update: { value: slots },
  })
  return NextResponse.json({ slots })
})
