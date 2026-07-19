import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPermission } from '@/lib/with-auth'

export const PATCH = withPermission('inventory', async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params
    const body = await req.json()
    const data: Record<string, unknown> = {}
    if (body.name       !== undefined) data.name       = body.name
    if (body.brand      !== undefined) data.brand      = body.brand || null
    if (body.category   !== undefined) data.category   = body.category
    if (body.unit       !== undefined) data.unit       = body.unit
    if (body.alertLevel !== undefined) data.alertLevel = Number(body.alertLevel)
    if (body.note       !== undefined) data.note       = body.note || null
    if (body.adjust     !== undefined) {
      const cur = await prisma.inventoryItem.findUnique({ where: { id } })
      if (!cur) return NextResponse.json({ error: 'not found' }, { status: 404 })
      data.quantity = Math.max(0, cur.quantity + Number(body.adjust))
    } else if (body.quantity !== undefined) {
      data.quantity = Number(body.quantity)
    }
    const item = await prisma.inventoryItem.update({ where: { id }, data })
    return NextResponse.json(item)
  } catch {
    return NextResponse.json({ error: '更新庫存失敗' }, { status: 500 })
  }
})

export const DELETE = withPermission('inventory', async (_: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params
    await prisma.inventoryItem.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch {
    return NextResponse.json({ error: '刪除庫存品項失敗' }, { status: 500 })
  }
})
