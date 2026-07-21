import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signSession, setAuthCookie } from '@/lib/auth-session'
import type { TokenPayload } from '@/lib/auth-server'
import { exchangeCode, isProviderEnabled, type OAuthProvider } from '@/lib/oauth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params
  const p = provider as OAuthProvider
  const loginUrl = (err: string) => NextResponse.redirect(new URL(`/login?error=${err}`, req.url))

  if (!isProviderEnabled(p)) return loginUrl('provider_disabled')

  const code  = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const savedState = req.cookies.get('oauth_state')?.value
  if (!code || !state || !savedState || state !== savedState) return loginUrl('invalid_state')

  const info = await exchangeCode(p, code, req.nextUrl.origin)
  if (!info?.email) return loginUrl('no_email')

  // 以 email 對應既有管理員帳號（第三方登入不自動建立帳號）
  const user = await prisma.adminUser.findUnique({ where: { email: info.email } })
  if (!user) return loginUrl('no_account')

  const token = await signSession({
    id: user.id,
    email: user.email,
    name: user.name,
    permissions: user.permissions,
  } as TokenPayload)

  const res = NextResponse.redirect(new URL('/', req.url))
  setAuthCookie(res, token)
  res.cookies.delete('oauth_state')
  return res
}
