import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPermission } from '@/lib/with-auth'

export const GET = withPermission('inventory', async () => {
  const sessions = await prisma.stockCheckSession.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { entries: true },
  })
  return NextResponse.json(sessions)
})

// Create a new draft session snapshotting current inventory
export const POST = withPermission('inventory', async (req: NextRequest) => {
  try {
    const { note } = await req.json().catch(() => ({ note: undefined }))
    const items = await prisma.inventoryItem.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] })
    const session = await prisma.stockCheckSession.create({
      data: {
        note: note || null,
        entries: {
          create: items.map(item => ({
            itemId: item.id,
            itemName: item.name,
            unit: item.unit,
            expected: item.quantity,
            actual: item.quantity,
          })),
        },
      },
      include: { entries: true },
    })
    return NextResponse.json(session, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
})
