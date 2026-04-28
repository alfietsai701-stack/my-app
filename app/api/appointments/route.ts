import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const date = searchParams.get('date') // YYYY-MM-DD
  const where = date ? {
    scheduledAt: {
      gte: new Date(`${date}T00:00:00`),
      lte: new Date(`${date}T23:59:59`),
    },
  } : {}

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
}

export async function POST(req: NextRequest) {
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
}
