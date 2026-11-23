// 驗證 LIFF 前端送來的 LINE ID token，取得「已驗證」的 LINE userId。
//
// 為什麼需要：前端直接送 userId 是可以被偽造的。只有向 LINE 驗證過的 ID token，
// 才能證明「這個請求真的是該 LINE 使用者本人送出的」。
//
// LIFF 所屬的 LINE Login channel ID 就是 LIFF ID 的前綴（例如 1234567890-AbCdEfGh → 1234567890），
// 因此預設從 NEXT_PUBLIC_LIFF_ID 推得；若不同可用 LIFF_CHANNEL_ID 覆寫。
const VERIFY_URL = 'https://api.line.me/oauth2/v2.1/verify'

function liffChannelId(): string | null {
  if (process.env.LIFF_CHANNEL_ID) return process.env.LIFF_CHANNEL_ID
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID
  const prefix = liffId?.split('-')[0]
  return prefix && /^\d+$/.test(prefix) ? prefix : null
}

/** 驗證成功回傳 LINE userId（sub），任何失敗都回傳 null。 */
export async function verifyLineIdToken(idToken: unknown): Promise<string | null> {
  if (typeof idToken !== 'string' || idToken.length === 0 || idToken.length > 4096) return null
  const clientId = liffChannelId()
  if (!clientId) {
    console.warn('無法取得 LIFF channel ID（請設定 NEXT_PUBLIC_LIFF_ID 或 LIFF_CHANNEL_ID），略過 LINE 綁定')
    return null
  }
  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id_token: idToken, client_id: clientId }),
    })
    if (!res.ok) return null
    const data = await res.json() as { sub?: unknown }
    return typeof data.sub === 'string' && data.sub.length > 0 ? data.sub : null
  } catch {
    return null
  }
}
