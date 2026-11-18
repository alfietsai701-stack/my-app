// 回訪燈號：顧客多久沒來就亮哪一級的燈。
// 目前門檻寫在這裡；之後若要讓店主在「設定」頁自行調整，改成從 Setting 讀取即可。
export const VISIT_LIGHT_DAYS = { green: 30, yellow: 90, red: 120 } as const

export type VisitLightLevel = keyof typeof VISIT_LIGHT_DAYS
export type VisitLight = { level: VisitLightLevel; days: number }

export const VISIT_LIGHT_LABEL: Record<VisitLightLevel, string> = { green: '綠燈', yellow: '黃燈', red: '紅燈' }

const DAY_MS = 24 * 60 * 60 * 1000

/** 依最近一次來訪時間算出燈號；30 天內來過或從未來訪則不亮燈（回傳 null）。 */
export function visitLight(lastVisitIso: string | null | undefined, now: number = Date.now()): VisitLight | null {
  if (!lastVisitIso) return null
  const days = Math.floor((now - new Date(lastVisitIso).getTime()) / DAY_MS)
  if (days > VISIT_LIGHT_DAYS.red) return { level: 'red', days }
  if (days > VISIT_LIGHT_DAYS.yellow) return { level: 'yellow', days }
  if (days > VISIT_LIGHT_DAYS.green) return { level: 'green', days }
  return null
}
