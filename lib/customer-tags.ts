// 顧客標籤：預設常用標籤供快速點選，亦可自由新增自訂標籤。
export const DEFAULT_CUSTOMER_TAGS = [
  'VIP',
  '新客',
  '熟客',
  '敏感肌',
  '孕婦',
  '指定設計師',
  '會員',
  '待追蹤',
] as const

export function sanitizeTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const cleaned = raw
    .filter((t): t is string => typeof t === 'string')
    .map(t => t.trim())
    .filter(t => t.length > 0 && t.length <= 20)
  return [...new Set(cleaned)].slice(0, 20)
}
