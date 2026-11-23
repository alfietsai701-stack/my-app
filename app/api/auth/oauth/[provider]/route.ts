import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-server'
import {
  appOrigin, buildAuthorizeUrl, isOAuthProvider, isProviderEnabled, randomToken,
  safeReturnPath, signState, stateCookieOptions, STATE_COOKIE,
} from '@/lib/oauth'

// 導向第三方授權頁。
//   /api/auth/oauth/google              → 用 Google 登入
//   /api/auth/oauth/google?mode=bind    → 已登入者綁定 Google（需要 session）
export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params
  const origin = appOrigin(req.nextUrl.origin)

  if (!isOAuthProvider(provider) || !isProviderEnabled(provider)) {
    return NextResponse.redirect(new URL('/login?error=provider_disabled', origin))
  }

  const mode = req.nextUrl.searchParams.get('mode') === 'bind' ? 'bind' : 'login'
  let userId: string | undefined
  if (mode === 'bind') {
    const session = await getSession()
    if (!session) return NextResponse.redirect(new URL('/login', origin))
    userId = session.id
  }

  const state = randomToken()
  const nonce = randomToken()
  const token = await signState({
    state, nonce, provider, mode, userId,
    returnTo: mode === 'bind' ? safeReturnPath(req.nextUrl.searchParams.get('return')) : undefined,
  })

  const res = NextResponse.redirect(buildAuthorizeUrl(provider, { origin, state, nonce }))
  res.cookies.set(STATE_COOKIE, token, stateCookieOptions)
  return res
}
