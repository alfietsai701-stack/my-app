import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth-server'

async function requireSettings() {
  const session = await getSession()
  if (!session?.permissions?.settings) {
    return NextResponse.json({ error: '無權限' }, { status: 403 })
  }
  return null
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireSettings()
  if (denied) return denied

  const { id } = await params
  const { name, password, permissions } = await request.json()

  const data: Record<string, unknown> = {}
  if (name) data.name = name
  if (password) data.passwordHash = await bcrypt.hash(password, 10)
  if (permissions) data.permissions = permissions

  const user = await prisma.adminUser.update({
    where: { id },
    data,
    select: { id: true, email: true, name: true, permissions: true, createdAt: true },
  })
  return NextResponse.json(user)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireSettings()
  if (denied) return denied

  const { id } = await params
  await prisma.adminUser.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
