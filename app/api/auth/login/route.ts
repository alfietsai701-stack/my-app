import { SignJWT } from 'jose'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET)

// ── Rate limiting (in-memory, per-instance) ───────────────────────────────────
// Note: in serverless each instance has its own store — acceptable for a small
// internal admin panel; replace with Redis/KV if stricter enforcement is needed.
const MAX_ATTEMPTS  = 5
const WINDOW_MS     = 15 * 60 * 1000  // 15 min
const LOCKOUT_MS    = 15 * 60 * 1000  // 15 min

type Attempt = { count: number; resetAt: number; lockedUntil?: number }
const attempts = new Map<string, Attempt>()

function checkRateLimit(key: string): { allowed: boolean; retryAfterSec?: number } {
  const now    = Date.now()
  const record = attempts.get(key)

  if (record?.lockedUntil && now < record.lockedUntil) {
    return { allowed: false, retryAfterSec: Math.ceil((record.lockedUntil - now) / 1000) }
  }

  if (!record || now > record.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true }
  }

  record.count += 1
  if (record.count > MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_MS
    return { allowed: false, retryAfterSec: Math.ceil(LOCKOUT_MS / 1000) }
  }

  return { allowed: true }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const body = await request.json()
  const email    = typeof body?.email    === 'string' ? body.email.trim()    : ''
  const password = typeof body?.password === 'string' ? body.password        : ''

  if (!email || !password) {
    return NextResponse.json({ error: '請填寫帳號與密碼' }, { status: 400 })
  }

  // Key by email so the same attacker can't just rotate IPs
  const { allowed, retryAfterSec } = checkRateLimit(email.toLowerCase())
  if (!allowed) {
    return NextResponse.json(
      { error: `登入嘗試過多，請 ${Math.ceil((retryAfterSec ?? LOCKOUT_MS / 1000) / 60)} 分鐘後再試` },
      { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
    )
  }

  const user = await prisma.adminUser.findUnique({ where: { email } })
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ error: '帳號或密碼錯誤' }, { status: 401 })
  }

  // Successful login — clear attempt counter
  attempts.delete(email.toLowerCase())

  const token = await new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    permissions: user.permissions,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('8h')
    .sign(secret)

  const response = NextResponse.json({ ok: true })
  response.cookies.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })
  return response
}
