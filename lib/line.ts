const LINE_PUSH_API  = 'https://api.line.me/v2/bot/message/push'
const LINE_REPLY_API = 'https://api.line.me/v2/bot/message/reply'

function headers() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
  }
}

// Push message to admin (existing feature)
export async function sendLineMessage(message: string): Promise<void> {
  const token    = process.env.LINE_CHANNEL_ACCESS_TOKEN
  const targetId = process.env.LINE_TARGET_ID
  if (!token || !targetId) { console.warn('LINE 推播未設定，跳過'); return }

  const res = await fetch(LINE_PUSH_API, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ to: targetId, messages: [{ type: 'text', text: message }] }),
  })
  if (!res.ok) throw new Error(`LINE 推播失敗：${res.status} ${await res.text()}`)
}

// Reply to user in conversation
export async function replyText(replyToken: string, text: string) {
  await fetch(LINE_REPLY_API, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ replyToken, messages: [{ type: 'text', text }] }),
  })
}

export async function replyImage(replyToken: string, imageUrl: string) {
  await fetch(LINE_REPLY_API, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      replyToken,
      messages: [{ type: 'image', originalContentUrl: imageUrl, previewImageUrl: imageUrl }],
    }),
  })
}

export async function replyQuickReply(
  replyToken: string,
  text: string,
  items: { label: string; text: string }[]
) {
  await fetch(LINE_REPLY_API, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      replyToken,
      messages: [{
        type: 'text',
        text,
        quickReply: {
          items: items.map(i => ({
            type: 'action',
            action: { type: 'message', label: i.label, text: i.text },
          })),
        },
      }],
    }),
  })
}
