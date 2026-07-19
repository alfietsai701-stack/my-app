import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeCustomer } from '@/lib/customer-serializers'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req: NextRequest) => {
  try {
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
  } catch {
    return NextResponse.json({ error: '讀取顧客失敗' }, { status: 500 })
  }
})

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const { name, phone, birthday, note } = await req.json()
    if (!name || !phone) {
      return NextResponse.json({ error: '缺少必填欄位：name、phone' }, { status: 400 })
    }
    if (!/^09\d{8}$/.test(phone.replace(/[-\s]/g, ''))) {
      return NextResponse.json({ error: '手機號碼格式錯誤' }, { status: 400 })
    }
    const customer = await prisma.customer.create({
      data: { name, phone, birthday: birthday ? new Date(birthday) : null, note: note || null },
      include: { _count: { select: { appointments: true } } },
    })
    return NextResponse.json(serializeCustomer(customer), { status: 201 })
  } catch {
    return NextResponse.json({ error: '建立顧客失敗' }, { status: 500 })
  }
})
