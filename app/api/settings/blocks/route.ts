import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withPermission } from '@/lib/with-auth'

type Block = { id: string; date: string; start: string; end: string; note?: string }

function parseBlocks(raw: unknown): Block[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (b): b is Block =>
      b != null &&
      typeof b.date === 'string' &&
      typeof b.start === 'string' &&
      typeof b.end === 'string',
  )
}

export const GET = withAuth(async (req: Request) => {
  try {
    const url = new URL(req.url)
    const month = url.searchParams.get('month')

    const setting = await prisma.setting.findUnique({ where: { key: 'book_blocks' } })
    const blocks = parseBlocks(setting?.value)

    if (month) {
      return NextResponse.json(blocks.filter(b => b.date.startsWith(month)))
    }
    return NextResponse.json(blocks)
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
})

export const POST = withPermission('settings', async (req: Request) => {
  try {
    const body = await req.json()
    const { date, start, end, note } = body
    if (!date || !start || !end) return NextResponse.json({ error: 'invalid' }, { status: 400 })

    const id = crypto.randomUUID()
    const newBlock: Block = { id, date, start, end, note }

    const setting = await prisma.setting.findUnique({ where: { key: 'book_blocks' } })
    const blocks = parseBlocks(setting?.value)
    const updated = [...blocks, newBlock]
    await prisma.setting.upsert({
      where: { key: 'book_blocks' },
      create: { key: 'book_blocks', value: updated },
      update: { value: updated },
    })

    return NextResponse.json(newBlock)
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
})

export const DELETE = withPermission('settings', async (req: Request) => {
  try {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

    const setting = await prisma.setting.findUnique({ where: { key: 'book_blocks' } })
    const blocks = parseBlocks(setting?.value)
    const updated = blocks.filter(b => b.id !== id)

    await prisma.setting.upsert({
      where: { key: 'book_blocks' },
      create: { key: 'book_blocks', value: updated },
      update: { value: updated },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
})
