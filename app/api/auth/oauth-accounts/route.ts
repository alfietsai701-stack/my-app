import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/with-auth'
import { PROVIDERS, isProviderEnabled } from '@/lib/oauth'

// 目前登入者的第三方登入綁定狀態
export const GET = withAuth(async (_req, _ctx, session) => {
  const accounts = await prisma.oAuthAccount.findMany({
    where: { adminUserId: session.id },
    select: { id: true, provider: true, displayName: true, email: true, createdAt: true, lastUsedAt: true },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json({
    providers: PROVIDERS.map(p => ({ provider: p, enabled: isProviderEnabled(p) })),
    accounts,
  })
})
