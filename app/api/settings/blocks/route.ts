import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type Block = { id: string; date: string; start: string; end: string; note?: string }

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const month = url.searchParams.get('month')

    const setting = await prisma.setting.findUnique({ where: { key: 'book_blocks' } })
    const raw = setting?.value as any
    const blocks: Block[] = Array.isArray(raw) ? raw.filter((b: any) => b && typeof b.date === 'string' && typeof b.start === 'string' && typeof b.end === 'string') : []

    if (month) {
      const filtered = blocks.filter(b => b.date.startsWith(month))
      return NextResponse.json(filtered)
    }

    return NextResponse.json(blocks)
  } catch (err) {
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { date, start, end, note } = body
    if (!date || !start || !end) return NextResponse.json({ error: 'invalid' }, { status: 400 })

    const id = (globalThis as any).crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2,8)}`
    const newBlock: Block = { id, date, start, end, note }

    const setting = await prisma.setting.findUnique({ where: { key: 'book_blocks' } })
    const raw = setting?.value as any
    const blocks: Block[] = Array.isArray(raw) ? raw.filter((b: any) => b && typeof b.date === 'string' && typeof b.start === 'string' && typeof b.end === 'string') : []
    const updated = [...blocks, newBlock]
    await prisma.setting.upsert({ where: { key: 'book_blocks' }, create: { key: 'book_blocks', value: updated }, update: { value: updated } })

    return NextResponse.json(newBlock)
  } catch (err) {
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

    const setting = await prisma.setting.findUnique({ where: { key: 'book_blocks' } })
    const raw = setting?.value as any
    const blocks: Block[] = Array.isArray(raw) ? raw.filter((b: any) => b && typeof b.date === 'string' && typeof b.start === 'string' && typeof b.end === 'string') : []
    const updated = blocks.filter((b: Block) => b.id !== id)

    await prisma.setting.upsert({ where: { key: 'book_blocks' }, create: { key: 'book_blocks', value: updated }, update: { value: updated } })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
