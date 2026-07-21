import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendLineToUser } from '@/lib/line'

export const maxDuration = 30

const BUSINESS_NAME = process.env.LINE_BUSINESS_NAME ?? '美業管理系統'
const TW_OFFSET_MS = 8 * 60 * 60 * 1000

// 消費前一日 LINE 提醒。由 Vercel Cron 每日觸發（見 vercel.json）。
// 授權：Vercel Cron 會帶 `authorization: Bearer <CRON_SECRET>`。
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return process.env.NODE_ENV !== 'production' // 未設定時僅允許非正式環境測試
  return req.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // 以台灣時間計算「明天」整日範圍，再轉回 UTC 查詢
  const nowTw = new Date(Date.now() + TW_OFFSET_MS)
  const y = nowTw.getUTCFullYear(), m = nowTw.getUTCMonth(), d = nowTw.getUTCDate()
  const startUtc = new Date(Date.UTC(y, m, d + 1, 0, 0, 0) - TW_OFFSET_MS)
  const endUtc   = new Date(Date.UTC(y, m, d + 2, 0, 0, 0) - TW_OFFSET_MS)

  const appts = await prisma.appointment.findMany({
    where: {
      scheduledAt: { gte: startUtc, lt: endUtc },
      status: { notIn: ['cancelled'] },
      customer: { lineUserId: { not: null }, deletedAt: null },
    },
    include: {
      customer: { select: { name: true, lineUserId: true } },
      service:  { select: { name: true, durationMin: true } },
    },
  })

  let sent = 0
  await Promise.all(appts.map(async a => {
    if (!a.customer.lineUserId) return
    const tw   = new Date(a.scheduledAt.getTime() + TW_OFFSET_MS)
    const time = `${String(tw.getUTCHours()).padStart(2, '0')}:${String(tw.getUTCMinutes()).padStart(2, '0')}`
    const dateStr = `${tw.getUTCFullYear()}年${tw.getUTCMonth() + 1}月${tw.getUTCDate()}日`
    const msg = [
      `🔔 預約提醒`,
      ``,
      `${a.customer.name} 您好，提醒您明天的預約：`,
      ``,
      `📋 服務：${a.service.name}`,
      `📅 日期：${dateStr}`,
      `⏰ 時間：${time}`,
      ``,
      `期待為您服務 🌿（${BUSINESS_NAME}）`,
      `如需更改或取消，請與我們聯繫。`,
    ].join('\n')
    try { await sendLineToUser(a.customer.lineUserId, msg); sent++ } catch {}
  }))

  return NextResponse.json({ ok: true, candidates: appts.length, sent })
}
