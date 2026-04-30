const LINE_PUSH_API  = 'https://api.line.me/v2/bot/message/push'
const LINE_REPLY_API = 'https://api.line.me/v2/bot/message/reply'

function getHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
  }
}

async function lineReply(body: object): Promise<void> {
  await fetch(LINE_REPLY_API, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  })
}

export async function replyMessages(replyToken: string, messages: object[]): Promise<void> {
  await lineReply({ replyToken, messages })
}

export async function sendLineMessage(message: string): Promise<void> {
  const token    = process.env.LINE_CHANNEL_ACCESS_TOKEN
  const targetId = process.env.LINE_TARGET_ID
  if (!token || !targetId) { console.warn('LINE 推播未設定，跳過'); return }

  const res = await fetch(LINE_PUSH_API, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ to: targetId, messages: [{ type: 'text', text: message }] }),
  })
  if (!res.ok) throw new Error(`LINE 推播失敗：${res.status} ${await res.text()}`)
}

export async function sendLineToUser(userId: string, message: string): Promise<void> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token) return
  await fetch(LINE_PUSH_API, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ to: userId, messages: [{ type: 'text', text: message }] }),
  })
}

export async function replyText(replyToken: string, text: string): Promise<void> {
  await lineReply({ replyToken, messages: [{ type: 'text', text }] })
}

export async function replyImage(replyToken: string, imageUrl: string, previewUrl?: string): Promise<void> {
  await lineReply({
    replyToken,
    messages: [{ type: 'image', originalContentUrl: imageUrl, previewImageUrl: previewUrl ?? imageUrl }],
  })
}

export async function replyDatePicker(
  replyToken: string,
  text: string,
  minDate: string,
  maxDate: string,
): Promise<void> {
  await lineReply({
    replyToken,
    messages: [{
      type: 'template',
      altText: text,
      template: {
        type: 'buttons',
        text: text.slice(0, 160),
        actions: [{
          type: 'datetimepicker',
          label: '📅 選擇日期',
          data: 'SELECT_DATE',
          mode: 'date',
          min: minDate,
          max: maxDate,
        }],
      },
    }],
  })
}

export async function replyQuickReply(
  replyToken: string,
  text: string,
  items: { label: string; text: string }[]
): Promise<void> {
  await lineReply({
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
  })
}
