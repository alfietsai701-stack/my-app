import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 依 LINE userId 查詢既有顧客，供預約表單自動帶入基本資料。
// userId 來自 LIFF 端的登入者本人，回傳的是使用者自己的資料。
export async function GET(req: NextRequest) {
  const lineUserId = req.nextUrl.searchParams.get('lineUserId')
  if (!lineUserId) return NextResponse.json({}, { status: 200 })

  const customer = await prisma.customer.findUnique({
    where: { lineUserId },
    select: { name: true, phone: true, email: true, deletedAt: true },
  })
  if (!customer || customer.deletedAt) return NextResponse.json({}, { status: 200 })

  return NextResponse.json({
    name: customer.name,
    phone: customer.phone,
    email: customer.email ?? '',
    returning: true,
  })
}
