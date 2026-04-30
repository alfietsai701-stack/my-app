import { NextRequest, NextResponse } from 'next/server'
import { getAvailableSlots } from '@/lib/slots'

export async function GET(req: NextRequest) {
  const date        = req.nextUrl.searchParams.get('date')
  const durationStr = req.nextUrl.searchParams.get('duration')

  if (!date || !durationStr) {
    return NextResponse.json({ error: '缺少 date 或 duration' }, { status: 400 })
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: '日期格式錯誤' }, { status: 400 })
  }

  const slots = await getAvailableSlots(date, Number(durationStr))
  return NextResponse.json(slots)
}
