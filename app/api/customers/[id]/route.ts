import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeCustomer, serializeCustomerDetail } from '@/lib/customer-serializers'
import { withAuth } from '@/lib/with-auth'
import { sanitizeTags } from '@/lib/customer-tags'

export const GET = withAuth(async (_: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
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
    return NextResponse.json(serializeCustomerDetail(customer))
  } catch {
    return NextResponse.json({ error: '讀取顧客失敗' }, { status: 500 })
  }
})

export const PATCH = withAuth(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params
    const body = await req.json()
    const data: Record<string, unknown> = {}
    if (body.name     !== undefined) data.name     = body.name
    if (body.phone    !== undefined) data.phone    = body.phone
    if (body.birthday !== undefined) data.birthday = body.birthday ? new Date(body.birthday) : null
    if (body.note     !== undefined) data.note     = body.note || null
    if (body.tags     !== undefined) data.tags     = sanitizeTags(body.tags)
    const customer = await prisma.customer.update({
      where: { id },
      data,
      include: { _count: { select: { appointments: true } } },
    })
    return NextResponse.json(serializeCustomer(customer))
  } catch {
    return NextResponse.json({ error: '更新顧客失敗' }, { status: 500 })
  }
})

export const DELETE = withAuth(async (_: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params
    await prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } })
    return new NextResponse(null, { status: 204 })
  } catch {
    return NextResponse.json({ error: '刪除顧客失敗' }, { status: 500 })
  }
})
