import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

// Keep singleton across hot-reloads in dev and across requests in Fluid Compute (prod)
globalForPrisma.prisma = prisma