import { SignJWT } from 'jose'
import type { NextResponse } from 'next/server'
import type { TokenPayload } from './auth-server'

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET)

export const AUTH_COOKIE = 'auth-token'
const MAX_AGE = 60 * 60 * 8 // 8h

/** 簽發登入 session JWT（帳密登入與第三方登入共用）。 */
export async function signSession(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('8h')
    .sign(secret)
}

export function setAuthCookie(res: NextResponse, token: string): void {
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  })
}
