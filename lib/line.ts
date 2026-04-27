const LINE_API = 'https://api.line.me/v2/bot/message/push'

export async function sendLineMessage(message: string): Promise<void> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  const targetId = process.env.LINE_TARGET_ID

  if (!token || !targetId) {
    console.warn('LINE Messaging API 未設定，跳過通知')
    return
  }

  const res = await fetch(LINE_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: targetId,
      messages: [{ type: 'text', text: message }],
    }),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`LINE 通知失敗：${res.status} ${error}`)
  }
}
