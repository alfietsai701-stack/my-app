import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { ENGINEER_PERMISSIONS, OWNER_PERMISSIONS, ASSISTANT_PERMISSIONS } from '../lib/permissions'

const prisma = new PrismaClient()

async function main() {
  const hash = (pw: string) => bcrypt.hash(pw, 10)

  await prisma.adminUser.upsert({
    where: { email: 'admin@ada-studio.com' },
    update: {},
    create: {
      email: 'admin@ada-studio.com',
      passwordHash: await hash('ada2026'),
      name: 'Alfie（工程師）',
      permissions: ENGINEER_PERMISSIONS,
    },
  })

  await prisma.adminUser.upsert({
    where: { email: 'mom@ada-studio.com' },
    update: {},
    create: {
      email: 'mom@ada-studio.com',
      passwordHash: await hash('ada2026'),
      name: '媽媽（老闆）',
      permissions: OWNER_PERMISSIONS,
    },
  })

  await prisma.adminUser.upsert({
    where: { email: 'assistant@ada-studio.com' },
    update: {},
    create: {
      email: 'assistant@ada-studio.com',
      passwordHash: await hash('ada2026'),
      name: '姐姐（助理）',
      permissions: ASSISTANT_PERMISSIONS,
    },
  })

  console.log('✅ Seeded 3 admin users')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
