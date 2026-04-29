import { prisma } from './prisma'

const DEFAULT_SLOTS = ['11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00']
const BUFFER_MIN    = 60
const CLOSING_MIN   = 20 * 60

// In-memory cache: avoids a DB round-trip on every slot query (TTL 5 min)
let _slotsCache: string[] | null = null
let _slotsCachedAt = 0
const SLOTS_TTL = 10 * 60 * 1000

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

// Returns slots available for a new appointment of durationMin on the given date
export async function getAvailableSlots(date: string, durationMin: number): Promise<string[]> {
  const [y, m, day] = date.split('-').map(Number)
  const start = new Date(y, m - 1, day, 0, 0, 0)
  const end   = new Date(y, m - 1, day, 23, 59, 59)

  const [businessSlots, appts] = await Promise.all([
    getBusinessSlots(),
    prisma.appointment.findMany({
      where: { scheduledAt: { gte: start, lte: end }, status: { not: 'cancelled' } },
      include: { service: { select: { durationMin: true } } },
    }),
  ])

  // Each existing appointment blocks [apptStart, apptStart + duration + buffer)
  // Convert UTC → Taiwan time (UTC+8) before extracting hours
  const TW_OFFSET_MS = 8 * 60 * 60 * 1000
  const blockedIntervals = appts.map(a => {
    const tw        = new Date(a.scheduledAt.getTime() + TW_OFFSET_MS)
    const apptStart = tw.getUTCHours() * 60 + tw.getUTCMinutes()
    return { start: apptStart, end: apptStart + a.service.durationMin + BUFFER_MIN }
  })

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
