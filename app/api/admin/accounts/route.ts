import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth-server'
import { DEFAULT_PERMISSIONS } from '@/lib/permissions'

async function requireSettings() {
  const session = await getSession()
  if (!session?.permissions?.settings) {
    return NextResponse.json({ error: '無權限' }, { status: 403 })
  }
  return null
}

export async function GET() {
  const denied = await requireSettings()
  if (denied) return denied

  const users = await prisma.adminUser.findMany({
    select: { id: true, email: true, name: true, permissions: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(users)
}

export async function POST(request: NextRequest) {
  const denied = await requireSettings()
  if (denied) return denied

  const { email, password, name, permissions } = await request.json()
  if (!email || !password || !name) {
    return NextResponse.json({ error: '請填寫所有欄位' }, { status: 400 })
  }

  const user = await prisma.adminUser.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(password, 10),
      name,
      permissions: permissions ?? DEFAULT_PERMISSIONS,
    },
    select: { id: true, email: true, name: true, permissions: true, createdAt: true },
  })
  return NextResponse.json(user, { status: 201 })
}
