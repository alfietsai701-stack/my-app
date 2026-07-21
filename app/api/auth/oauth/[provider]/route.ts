import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { providerConfig, isProviderEnabled, redirectUri, type OAuthProvider } from '@/lib/oauth'

// 導向第三方授權頁（Google / LINE）
export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params
  const p = provider as OAuthProvider
  const cfg = providerConfig(p)
  if (!cfg || !isProviderEnabled(p)) {
    return NextResponse.redirect(new URL('/login?error=provider_disabled', req.url))
  }

  const origin = req.nextUrl.origin
  const state = crypto.randomBytes(16).toString('hex')

  const url = new URL(cfg.authorizeUrl)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', cfg.clientId!)
  url.searchParams.set('redirect_uri', redirectUri(origin, p))
  url.searchParams.set('scope', cfg.scope)
  url.searchParams.set('state', state)

  const res = NextResponse.redirect(url)
  res.cookies.set('oauth_state', state, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', maxAge: 600, path: '/',
  })
  return res
}
