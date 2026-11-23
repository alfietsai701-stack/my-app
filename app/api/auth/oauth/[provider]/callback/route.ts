import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth-server'
import { signSession, setAuthCookie } from '@/lib/auth-session'
import type { TokenPayload } from '@/lib/auth-server'
import type { Permissions } from '@/lib/permissions'
import {
  appOrigin, fetchIdentity, isOAuthProvider, isProviderEnabled, readState,
  safeReturnPath, stateCookieOptions, STATE_COOKIE,
} from '@/lib/oauth'

// 第三方平台授權完回到這裡。依 state 裡的模式決定是「登入」還是「綁定」。
export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params
  const origin = appOrigin(req.nextUrl.origin)
  const qs = req.nextUrl.searchParams
  const st = await readState(req.cookies.get(STATE_COOKIE)?.value)

  const redirect = (path: string) => {
    const res = NextResponse.redirect(new URL(path, origin))
    res.cookies.set(STATE_COOKIE, '', { ...stateCookieOptions, maxAge: 0 })
    return res
  }
  // 綁定失敗回到原頁面並打開「登入方式」；登入失敗回登入頁
  const fail = (code: string) => {
    if (st?.mode === 'bind') {
      const back = new URL(safeReturnPath(st.returnTo), origin)
      back.searchParams.set('login_methods', '1')
      back.searchParams.set('oauth_error', code)
      return redirect(back.pathname + back.search)
    }
    return redirect(`/login?error=${code}`)
  }

  if (!isOAuthProvider(provider) || !isProviderEnabled(provider)) return fail('provider_disabled')

  // 使用者在授權頁按了取消（Google/LINE/FB: access_denied；Apple: user_cancelled_authorize）
  if (qs.get('error')) return fail('cancelled')

  const code = qs.get('code')
  if (!code || !st || st.provider !== provider || qs.get('state') !== st.state) return fail('invalid_state')

  let identity
  try {
    identity = await fetchIdentity(provider, code, origin, st.nonce)
  } catch (err) {
    console.error(`[oauth] ${provider} identity failed:`, err)
    return fail('exchange_failed')
  }

  const key = { provider_providerUserId: { provider, providerUserId: identity.providerUserId } }

  // ── 綁定 ──
  if (st.mode === 'bind') {
    const session = await getSession()
    if (!session || session.id !== st.userId) return fail('invalid_state')

    const existing = await prisma.oAuthAccount.findUnique({ where: key })
    if (existing && existing.adminUserId !== session.id) return fail('already_bound')

    try {
      // 同一個後台帳號每個平台只綁一個；重新綁定就換成新的第三方帳號
      await prisma.oAuthAccount.upsert({
        where: { adminUserId_provider: { adminUserId: session.id, provider } },
        create: {
          provider, providerUserId: identity.providerUserId, adminUserId: session.id,
          displayName: identity.name, email: identity.email,
        },
        update: {
          providerUserId: identity.providerUserId,
          displayName: identity.name, email: identity.email, createdAt: new Date(),
        },
      })
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return fail('already_bound')
      throw err
    }

    const back = new URL(safeReturnPath(st.returnTo), origin)
    back.searchParams.set('login_methods', '1')
    back.searchParams.set('linked', provider)
    return redirect(back.pathname + back.search)
  }

  // ── 登入 ──
  const account = await prisma.oAuthAccount.findUnique({ where: key, include: { adminUser: true } })
  if (!account) return fail('not_linked')

  await prisma.oAuthAccount.update({ where: { id: account.id }, data: { lastUsedAt: new Date() } })

  const user = account.adminUser
  const token = await signSession({
    id: user.id,
    email: user.email,
    name: user.name,
    permissions: user.permissions as Permissions,
  } satisfies TokenPayload)

  const res = redirect('/')
  setAuthCookie(res, token)
  return res
}
