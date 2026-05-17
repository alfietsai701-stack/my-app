import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeCustomer } from '@/lib/customer-serializers'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  const customers = await prisma.customer.findMany({
    where: {
      deletedAt: null,
      ...(q ? { OR: [{ name: { contains: q } }, { phone: { contains: q } }] } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { appointments: true } } },
  })
  return NextResponse.json(customers.map(serializeCustomer))
}

export async function POST(req: NextRequest) {
  const { name, phone, birthday, note } = await req.json()
  const customer = await prisma.customer.create({
    data: { name, phone, birthday: birthday ? new Date(birthday) : null, note: note || null },
    include: { _count: { select: { appointments: true } } },
  })
  return NextResponse.json(serializeCustomer(customer), { status: 201 })
}
