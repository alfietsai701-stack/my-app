import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth-server'

export async function PATCH(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '未登入' }, { status: 401 })

  const { currentPassword, newPassword } = await request.json()
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: '請填寫所有欄位' }, { status: 400 })
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: '新密碼至少 6 個字元' }, { status: 400 })
  }

  const user = await prisma.adminUser.findUnique({ where: { id: session.id } })
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    return NextResponse.json({ error: '目前密碼錯誤' }, { status: 401 })
  }

  await prisma.adminUser.update({
    where: { id: session.id },
    data: { passwordHash: await bcrypt.hash(newPassword, 10) },
  })

  return NextResponse.json({ ok: true })
}
