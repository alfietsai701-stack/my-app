import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { markWhatsNewSeen } from '@/lib/whats-new'

// 使用者按「知道了」：記錄這個帳號已看過目前的改版公告
export const POST = withAuth(async (_req, _ctx, session) => {
  await markWhatsNewSeen(session.id)
  return NextResponse.json({ ok: true })
})
