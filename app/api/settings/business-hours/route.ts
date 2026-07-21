import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withPermission } from '@/lib/with-auth'
import { getBusinessHours, sanitizeBusinessHours, clearBusinessHoursCache } from '@/lib/business-hours'

export const GET = withAuth(async () => {
  return NextResponse.json(await getBusinessHours())
})

export const PATCH = withPermission('settings', async (req: NextRequest) => {
  const body = await req.json()
  const clean = sanitizeBusinessHours(body)
  await prisma.setting.upsert({
    where:  { key: 'business_hours' },
    create: { key: 'business_hours', value: clean },
    update: { value: clean },
  })
  clearBusinessHoursCache()
  return NextResponse.json(clean)
})
