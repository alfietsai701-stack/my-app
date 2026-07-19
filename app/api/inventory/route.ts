import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withPermission } from '@/lib/with-auth'

export const GET = withAuth(async () => {
  try {
    const items = await prisma.inventoryItem.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] })
    return NextResponse.json(items)
  } catch {
    return NextResponse.json({ error: '讀取庫存失敗' }, { status: 500 })
  }
})

export const POST = withPermission('inventory', async (req: NextRequest) => {
  try {
    const { name, brand, category, quantity, alertLevel, unit, note } = await req.json()
    if (!name || !category || quantity === undefined || alertLevel === undefined || !unit) {
      return NextResponse.json({ error: '缺少必填欄位：name、category、quantity、alertLevel、unit' }, { status: 400 })
    }
    if (isNaN(Number(quantity)) || isNaN(Number(alertLevel))) {
      return NextResponse.json({ error: 'quantity 和 alertLevel 必須為數字' }, { status: 400 })
    }
    const item = await prisma.inventoryItem.create({
      data: { name, brand: brand || null, category, quantity: Number(quantity), alertLevel: Number(alertLevel), unit, note: note || null },
    })
    return NextResponse.json(item, { status: 201 })
  } catch {
    return NextResponse.json({ error: '建立庫存品項失敗' }, { status: 500 })
  }
})
