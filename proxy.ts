import { jwtVerify } from 'jose'
import { NextRequest, NextResponse } from 'next/server'

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET)

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth') || pathname.startsWith('/api/line')) {
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
