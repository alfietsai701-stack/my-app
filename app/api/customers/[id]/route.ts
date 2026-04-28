import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      appointments: {
        orderBy: { scheduledAt: 'desc' },
        include: { service: true, receipt: true },
      },
      member: true,
    },
  })
  if (!customer) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(customer)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { name, phone, birthday, note } = await req.json()
  const customer = await prisma.customer.update({
    where: { id },
    data: { name, phone, birthday: birthday ? new Date(birthday) : null, note: note || null },
    include: { _count: { select: { appointments: true } } },
  })
  return NextResponse.json(customer)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } })
  return new NextResponse(null, { status: 204 })
}
