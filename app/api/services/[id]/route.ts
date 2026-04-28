import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth-server'

async function requireServices() {
  const session = await getSession()
  if (!session?.permissions?.services) return NextResponse.json({ error: '無權限' }, { status: 403 })
  return null
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireServices()
  if (denied) return denied

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
  return NextResponse.json(service)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireServices()
  if (denied) return denied

  const { id } = await params
  await prisma.service.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
