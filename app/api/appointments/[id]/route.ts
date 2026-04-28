import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.status      !== undefined) data.status      = body.status
  if (body.note        !== undefined) data.note        = body.note || null
  if (body.scheduledAt !== undefined) data.scheduledAt = new Date(body.scheduledAt)
  if (body.serviceId   !== undefined) data.serviceId   = body.serviceId
  if (body.customerId  !== undefined) data.customerId  = body.customerId

  const appointment = await prisma.appointment.update({
    where: { id },
    data,
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      service:  { select: { id: true, name: true, durationMin: true, price: true } },
      receipt:  true,
    },
  })

  // If completing and payment info provided, create receipt
  if (body.status === 'completed' && body.payMethod && !appointment.receipt) {
    await prisma.receipt.create({
      data: {
        appointmentId: id,
        total: body.total ?? appointment.service.price,
        payMethod: body.payMethod,
      },
    })
  }

  return NextResponse.json(appointment)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.appointment.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
