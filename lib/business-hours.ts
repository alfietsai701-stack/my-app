import { prisma } from './prisma'

/**
 * 營業／公休設定
 *  - closedWeekdays：每週固定公休（0=週日 … 6=週六）。預設 [0]（週日公休）。
 *  - closedDates：臨時公休日（YYYY-MM-DD），例如國定假日、店休。
 *  - openDates：特殊營業日（YYYY-MM-DD），可覆蓋 closedWeekdays，讓原本公休的星期照常營業。
 *
 * 全部存在 Setting 資料表的 `business_hours` key，改設定不需動程式碼。
 */
export type BusinessHours = {
  closedWeekdays: number[]
  closedDates: string[]
  openDates: string[]
}

const DEFAULT_HOURS: BusinessHours = {
  closedWeekdays: [0], // 預設維持「週日公休」，與舊行為相容
  closedDates: [],
  openDates: [],
}

// 與 slots.ts 相同的輕量快取策略（TTL 10 分鐘）
let _cache: BusinessHours | null = null
let _cachedAt = 0
const TTL = 10 * 60 * 1000

export function clearBusinessHoursCache() {
  _cache = null
  _cachedAt = 0
}

function sanitize(raw: unknown): BusinessHours {
  const v = (raw ?? {}) as Partial<BusinessHours>
  const weekdays = Array.isArray(v.closedWeekdays)
    ? v.closedWeekdays.filter(n => typeof n === 'number' && n >= 0 && n <= 6)
    : DEFAULT_HOURS.closedWeekdays
  const dateArr = (a: unknown): string[] =>
    Array.isArray(a) ? a.filter(d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) : []
  return {
    closedWeekdays: [...new Set(weekdays)],
    closedDates: dateArr(v.closedDates),
    openDates: dateArr(v.openDates),
  }
}

export async function getBusinessHours(): Promise<BusinessHours> {
  if (_cache && Date.now() - _cachedAt < TTL) return _cache
  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'business_hours' } })
    _cache = setting?.value ? sanitize(setting.value) : DEFAULT_HOURS
  } catch {
    _cache = DEFAULT_HOURS
  }
  _cachedAt = Date.now()
  return _cache
}

/** 純函式：給定設定，判斷某日是否公休。 */
export function isClosedOn(dateStr: string, hours: BusinessHours): boolean {
  if (hours.openDates.includes(dateStr)) return false          // 特殊營業日優先
  if (hours.closedDates.includes(dateStr)) return true         // 臨時公休日
  const [y, m, d] = dateStr.split('-').map(Number)
  const weekday = new Date(y, m - 1, d).getDay()
  return hours.closedWeekdays.includes(weekday)
}

/** 便利方法：直接查資料庫判斷某日是否公休（伺服器端使用）。 */
export async function isClosedDate(dateStr: string): Promise<boolean> {
  return isClosedOn(dateStr, await getBusinessHours())
}

export { DEFAULT_HOURS, sanitize as sanitizeBusinessHours }
