import { PrismaClient } from '@prisma/client'
import { prisma } from './prisma'

const DEFAULT_SLOTS = ['11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00']
const BUFFER_MIN    = 60
const CLOSING_MIN   = 20 * 60

// In-memory cache: avoids a DB round-trip on every slot query (TTL 10 min)
// Note: in serverless each instance has its own cache — acceptable for rarely-changing config
let _slotsCache: string[] | null = null
let _slotsCachedAt = 0
const SLOTS_TTL = 10 * 60 * 1000

// Supports both the global PrismaClient and the interactive-transaction client
// (Prisma.TransactionClient is PrismaClient minus $connect/$disconnect/$on/$transaction/$use/$extends)
type DbClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

export async function getBusinessSlots(): Promise<string[]> {
  if (_slotsCache && Date.now() - _slotsCachedAt < SLOTS_TTL) return _slotsCache
  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'business_slots' } })
    if (setting?.value) {
      _slotsCache = setting.value as string[]
      _slotsCachedAt = Date.now()
      return _slotsCache
    }
  } catch {}
  _slotsCache = DEFAULT_SLOTS
  _slotsCachedAt = Date.now()
  return DEFAULT_SLOTS
}

// Returns slots available for a new appointment of durationMin on the given date.
// Accepts an optional Prisma transaction client so this can be called inside a $transaction.
export async function getAvailableSlots(
  date: string,
  durationMin: number,
  db: DbClient = prisma,
): Promise<string[]> {
  const [y, m, day] = date.split('-').map(Number)
  const start = new Date(y, m - 1, day, 0, 0, 0)
  const end   = new Date(y, m - 1, day, 23, 59, 59)

  const [businessSlots, appts, blocksSetting] = await Promise.all([
    getBusinessSlots(),
    db.appointment.findMany({
      where: { scheduledAt: { gte: start, lte: end }, status: { not: 'cancelled' } },
      include: { service: { select: { durationMin: true } } },
    }),
    // also read manual blocks from settings
    db.setting.findUnique({ where: { key: 'book_blocks' } }),
  ])

  const blocks = (blocksSetting?.value ?? []) as Array<{ date: string; start: string; end: string }>

  // Each existing appointment blocks [apptStart, apptStart + duration + buffer)
  // Convert UTC → Taiwan time (UTC+8) before extracting hours
  const TW_OFFSET_MS = 8 * 60 * 60 * 1000
  const blockedIntervals = appts.map(a => {
    const tw        = new Date(a.scheduledAt.getTime() + TW_OFFSET_MS)
    const apptStart = tw.getUTCHours() * 60 + tw.getUTCMinutes()
    return { start: apptStart, end: apptStart + a.service.durationMin + BUFFER_MIN }
  })

  // Add manual blocks (stored as {date, start, end})
  try {
    for (const b of blocks) {
      if (b.date !== date) continue
      const [sh, sm] = b.start.split(':').map(Number)
      const [eh, em] = b.end.split(':').map(Number)
      const startMin = sh * 60 + sm
      const endMin = eh * 60 + em
      blockedIntervals.push({ start: startMin, end: endMin })
    }
  } catch {}

  return businessSlots.filter(slot => {
    const [sh, sm]    = slot.split(':').map(Number)
    const slotStart   = sh * 60 + sm
    const slotEnd     = slotStart + durationMin  // end of proposed new appointment

    // Must not exceed closing time
    if (slotEnd > CLOSING_MIN) return false

    // Must not overlap with any existing appointment's blocked period
    return !blockedIntervals.some(({ start, end }) =>
      slotStart < end && slotEnd > start
    )
  })
}

// For admin UI: returns set of slots that are blocked by buffer (not the slot with the appointment itself)
export function calcBlockedSlots(
  appts: Array<{ scheduledAt: string; status: string; service: { durationMin: number } }>,
  allSlots: string[]
): Set<string> {
  const blocked = new Set<string>()

  appts.filter(a => a.status !== 'cancelled').forEach(a => {
    const d = new Date(a.scheduledAt)
    const apptStart = d.getHours() * 60 + d.getMinutes()
    const apptEnd   = apptStart + a.service.durationMin + BUFFER_MIN

    allSlots.forEach(slot => {
      const [sh, sm] = slot.split(':').map(Number)
      const slotMin  = sh * 60 + sm
      // Block slots that fall WITHIN the duration+buffer window (after the appointment slot itself)
      if (slotMin > apptStart && slotMin < apptEnd) {
        blocked.add(slot)
      }
    })
  })

  return blocked
}
