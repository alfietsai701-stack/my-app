import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServices, revalidateServices } from '@/lib/service-data'
import { withAuth, withPermission } from '@/lib/with-auth'

export const GET = withAuth(async () => {
  try {
    const services = await getServices()
    return NextResponse.json(services)
  } catch {
    return NextResponse.json({ error: '讀取服務失敗' }, { status: 500 })
  }
})

export const POST = withPermission('services', async (request: NextRequest) => {
  try {
    const { name, price, durationMin, category } = await request.json()
    if (!name || price == null || !durationMin || !category) {
      return NextResponse.json({ error: '請填寫所有欄位' }, { status: 400 })
    }
    const service = await prisma.service.create({
      data: { name, price: Number(price), durationMin: Number(durationMin), category },
    })
    revalidateServices()
    return NextResponse.json(service, { status: 201 })
  } catch {
    return NextResponse.json({ error: '建立服務失敗' }, { status: 500 })
  }
})
