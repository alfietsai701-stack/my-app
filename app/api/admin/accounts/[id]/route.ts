import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { withPermission } from '@/lib/with-auth'

export const PATCH = withPermission('settings', async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
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
})

export const DELETE = withPermission('settings', async (_: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  await prisma.adminUser.delete({ where: { id } })
  return NextResponse.json({ ok: true })
})
