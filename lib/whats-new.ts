// 後台「改版公告」：每個帳號第一次登入時，在內容最上方顯示一次。
// 看過與否記在既有的 Setting 表（key = whats_new_seen:<帳號 id>，value = 看過的公告 id），
// 不需要改資料庫結構。下次有新改版時，換一個 WHATS_NEW.id，所有人就會再看到一次。

import { prisma } from './prisma'
import { WHATS_NEW } from './whats-new-content'

export { WHATS_NEW }

const seenKey = (userId: string) => `whats_new_seen:${userId}`

/** 這個帳號是否還沒看過目前的公告；讀取失敗時不顯示，避免影響後台 */
export async function shouldShowWhatsNew(userId: string): Promise<boolean> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: seenKey(userId) } })
    return row?.value !== WHATS_NEW.id
  } catch {
    return false
  }
}

export async function markWhatsNewSeen(userId: string) {
  await prisma.setting.upsert({
    where:  { key: seenKey(userId) },
    create: { key: seenKey(userId), value: WHATS_NEW.id },
    update: { value: WHATS_NEW.id },
  })
}
