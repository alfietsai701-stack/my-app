import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const items = await prisma.inventoryItem.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] })
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const { name, brand, category, quantity, alertLevel, unit, note } = await req.json()
  const item = await prisma.inventoryItem.create({
    data: { name, brand: brand || null, category, quantity: Number(quantity), alertLevel: Number(alertLevel), unit, note: note || null },
  })
  return NextResponse.json(item, { status: 201 })
}
