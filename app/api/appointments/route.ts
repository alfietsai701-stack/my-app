import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = req.nextUrl
  const date  = searchParams.get('date')  // YYYY-MM-DD
  const month = searchParams.get('month') // YYYY-MM
  const where = date ? {
    scheduledAt: { gte: new Date(`${date}T00:00:00`), lte: new Date(`${date}T23:59:59`) },
  } : month ? (() => {
    const [y, m] = month.split('-').map(Number)
    return { scheduledAt: { gte: new Date(y, m - 1, 1), lte: new Date(y, m, 0, 23, 59, 59) } }
  })() : {}

  const appointments = await prisma.appointment.findMany({
    where,
    orderBy: { scheduledAt: 'asc' },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      service:  { select: { id: true, name: true, durationMin: true, price: true } },
      receipt:  true,
    },
  })
  return NextResponse.json(appointments)
})

export const POST = withAuth(async (req: NextRequest) => {
  const { customerId, serviceId, scheduledAt, note } = await req.json()
  const appointment = await prisma.appointment.create({
    data: { customerId, serviceId, scheduledAt: new Date(scheduledAt), note: note || null },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      service:  { select: { id: true, name: true, durationMin: true, price: true } },
      receipt:  true,
    },
  })
  return NextResponse.json(appointment, { status: 201 })
})
