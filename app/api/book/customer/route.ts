import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyLineIdToken } from '@/lib/line-auth'
import { rateLimit, clientIp } from '@/lib/rate-limit'

// 依「已驗證」的 LINE 身分查詢既有顧客，供預約表單自動帶入基本資料。
// 前端送 LIFF 的 ID token（放在 body，不放網址），後端向 LINE 驗證後才查詢，
// 因此只能查到登入者本人綁定的資料，無法用別人的 userId 撈資料。
export async function POST(req: NextRequest) {
  const rl = rateLimit(`book-customer:${clientIp(req)}`, 30, 10 * 60 * 1000)
  if (!rl.ok) return NextResponse.json({}, { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } })

  const body = await req.json().catch(() => ({}))
  const lineUserId = await verifyLineIdToken(body?.idToken)
  if (!lineUserId) return NextResponse.json({})

  const customer = await prisma.customer.findUnique({
    where: { lineUserId },
    select: { name: true, phone: true, email: true, deletedAt: true },
  })
  if (!customer || customer.deletedAt) return NextResponse.json({})

  return NextResponse.json({
    name: customer.name,
    phone: customer.phone,
    email: customer.email ?? '',
    returning: true,
  })
}
