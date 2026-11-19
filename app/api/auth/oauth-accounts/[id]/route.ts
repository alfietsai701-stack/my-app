import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/with-auth'

// 解除自己的第三方登入綁定（只能刪自己的）
export const DELETE = withAuth<{ params: Promise<{ id: string }> }>(async (_req, { params }, session) => {
  const { id } = await params
  const { count } = await prisma.oAuthAccount.deleteMany({ where: { id, adminUserId: session.id } })
  if (count === 0) return NextResponse.json({ error: '找不到這個綁定' }, { status: 404 })
  return NextResponse.json({ ok: true })
})
