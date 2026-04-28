import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth-server'

export async function GET() {
  const services = await prisma.service.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] })
  return NextResponse.json(services)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session?.permissions?.services) return NextResponse.json({ error: '無權限' }, { status: 403 })

  const { name, price, durationMin, category } = await request.json()
  if (!name || price == null || !durationMin || !category) {
    return NextResponse.json({ error: '請填寫所有欄位' }, { status: 400 })
  }

  const service = await prisma.service.create({
    data: { name, price: Number(price), durationMin: Number(durationMin), category },
  })
  return NextResponse.json(service, { status: 201 })
}
