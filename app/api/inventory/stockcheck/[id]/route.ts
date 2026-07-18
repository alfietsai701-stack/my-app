import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPermission } from '@/lib/with-auth'

// Confirm stockcheck: update actual quantities on entries + update inventory + mark completed
export const PATCH = withPermission('inventory', async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const { entries } = await req.json() as { entries: { id: string; actual: number }[] }

  await Promise.all(
    entries.map(e => prisma.stockCheckEntry.update({ where: { id: e.id }, data: { actual: e.actual } }))
  )

  const session = await prisma.stockCheckSession.findUnique({ where: { id }, include: { entries: true } })
  if (!session) return NextResponse.json({ error: 'not found' }, { status: 404 })

  await Promise.all(
    session.entries.map(e =>
      prisma.inventoryItem.update({ where: { id: e.itemId }, data: { quantity: e.actual } })
    )
  )

  const completed = await prisma.stockCheckSession.update({
    where: { id },
    data: { completedAt: new Date() },
    include: { entries: true },
  })
  return NextResponse.json(completed)
})

export const GET = withPermission('inventory', async (_: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const session = await prisma.stockCheckSession.findUnique({ where: { id }, include: { entries: true } })
  if (!session) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(session)
})
