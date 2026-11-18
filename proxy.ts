import { jwtVerify } from 'jose'
import { NextRequest, NextResponse } from 'next/server'

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET)

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/book') ||
    pathname.startsWith('/ui-preview') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/book') ||
    pathname.startsWith('/api/line') ||
    // Vercel Cron 不帶登入 cookie；授權改由 route 內的 CRON_SECRET 檢查
    pathname.startsWith('/api/cron') ||
    /\.(png|jpg|jpeg|gif|webp|svg|ico)$/.test(pathname)
  ) {
    return NextResponse.next()
  }

  const token = request.cookies.get('auth-token')?.value
  if (token) {
    try {
      await jwtVerify(token, secret)
      return NextResponse.next()
    } catch {
      // token invalid or expired
    }
  }

  return NextResponse.redirect(new URL('/login', request.url))
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
