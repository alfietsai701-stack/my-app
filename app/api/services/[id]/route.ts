import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { revalidateServices } from '@/lib/service-data'
import { withPermission } from '@/lib/with-auth'

export const PATCH = withPermission('services', async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params
    const { name, price, durationMin, category } = await request.json()
    const service = await prisma.service.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(price != null && { price: Number(price) }),
        ...(durationMin && { durationMin: Number(durationMin) }),
        ...(category && { category }),
      },
    })
    revalidateServices()
    return NextResponse.json(service)
  } catch {
    return NextResponse.json({ error: '更新服務失敗' }, { status: 500 })
  }
})

export const DELETE = withPermission('services', async (_: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params
    await prisma.service.delete({ where: { id } })
    revalidateServices()
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: '刪除服務失敗' }, { status: 500 })
  }
})
