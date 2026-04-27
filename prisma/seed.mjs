import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const ENGINEER = { dashboard:true, appointments:true, customers:true, services:true, inventory:true, reports:true, members:true, settings:true }
const OWNER    = { dashboard:true, appointments:true, customers:true, services:true, inventory:true, reports:true, members:true, settings:false }
const ASSISTANT = { dashboard:true, appointments:true, customers:true, services:false, inventory:false, reports:false, members:false, settings:false }

async function main() {
  const hash = (pw) => bcrypt.hash(pw, 10)

  await prisma.adminUser.upsert({
    where: { email: 'admin@ada-studio.com' },
    update: {},
    create: { email: 'admin@ada-studio.com', passwordHash: await hash('ada2026'), name: 'Alfie（工程師）', permissions: ENGINEER },
  })
  await prisma.adminUser.upsert({
    where: { email: 'mom@ada-studio.com' },
    update: {},
    create: { email: 'mom@ada-studio.com', passwordHash: await hash('ada2026'), name: '媽媽（老闆）', permissions: OWNER },
  })
  await prisma.adminUser.upsert({
    where: { email: 'assistant@ada-studio.com' },
    update: {},
    create: { email: 'assistant@ada-studio.com', passwordHash: await hash('ada2026'), name: '姐姐（助理）', permissions: ASSISTANT },
  })

  console.log('✅ Seeded 3 admin users')
}

main().catch(console.error).finally(() => prisma.$disconnect())
