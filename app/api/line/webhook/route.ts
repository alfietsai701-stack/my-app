import { NextRequest, NextResponse, after } from 'next/server'
import crypto from 'crypto'
import { replyText, replyImage, replyMessages } from '@/lib/line'

export const maxDuration = 30

const BASE_URL = process.env.NEXTAUTH_URL?.replace('http://localhost:3000', 'https://my-app-taupe-three-92.vercel.app') ?? 'https://my-app-taupe-three-92.vercel.app'

const BUSINESS_NAME = process.env.LINE_BUSINESS_NAME ?? '預約服務'
const SOCIAL_URL    = process.env.LINE_SOCIAL_URL    ?? ''

// ── Signature verification ────────────────────────────────────────────────────

function verifySignature(body: string, signature: string): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET
  if (!secret) return true
  const hash = crypto.createHmac('sha256', secret).update(body).digest('base64')
  return hash === signature
}

// ── Menu handlers ─────────────────────────────────────────────────────────────

async function handleBooking(token: string) {
  const bookingUrl = `${BASE_URL}/book`

  await replyMessages(token, [{
    type: 'template',
    altText: `點選連結開始線上預約：${bookingUrl}`,
    template: {
      type: 'buttons',
      title: `預約 ${BUSINESS_NAME}`,
      text: '點選下方按鈕，即可在線上快速完成預約 ✨',
      actions: [{
        type: 'uri',
        label: '📅 立即預約',
        uri: bookingUrl,
      }],
    },
  }])
}

async function handlePriceList(token: string) {
  await replyImage(token, `${BASE_URL}/price-list.png`, `${BASE_URL}/price-list-preview.png`)
}

async function handleNotes(token: string) {
  await replyImage(token, `${BASE_URL}/booking-notes.png`, `${BASE_URL}/booking-notes-preview.png`)
}

async function handlePromotion(token: string) {
  await replyText(token, '🎁 優惠活動\n\n目前尚無進行中的優惠活動。\n\n請持續關注我們的 LINE 官方帳號，\n最新消息將第一時間通知您 🌿')
}

async function handleLinks(token: string) {
  const body = SOCIAL_URL
    ? `🔗 ${BUSINESS_NAME} 官方連結\n\n📸 社群媒體\n${SOCIAL_URL}`
    : `🔗 ${BUSINESS_NAME} 官方連結\n\n目前尚未設定社群連結。`
  await replyText(token, body)
}

const MENU_KEYWORDS: Record<string, (token: string) => Promise<void>> = {
  '__BOOKING__': handleBooking,
  '__PRICE__':   handlePriceList,
  '__NOTES__':   handleNotes,
  '__PROMO__':   handlePromotion,
  '__LINKS__':   handleLinks,
}

// ── Event processor ───────────────────────────────────────────────────────────

async function processEvent(event: unknown) {
  const ev = event as Record<string, unknown>

  if ((ev.type as string) !== 'message') return
  const msg = ev.message as Record<string, unknown>
  if (msg?.type !== 'text') return

  const replyToken = ev.replyToken as string
  const text       = (msg.text as string).trim()
  if (!replyToken) return

  const handler = MENU_KEYWORDS[text]
  if (!handler) return

  try {
    await handler(replyToken)
  } catch (err) {
    console.error('LINE webhook error:', err)
    await replyText(replyToken, '系統忙碌，請稍後再試一次。').catch(() => {})
  }
}

async function processEvents(events: unknown[]) {
  await Promise.all(events.map(e => processEvent(e)))
}

// ── Main webhook handler ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody   = await req.text()
  const signature = req.headers.get('x-line-signature') ?? ''

  if (!verifySignature(rawBody, signature)) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { events = [] } = JSON.parse(rawBody)

  after(async () => {
    await processEvents(events)
  })

  return new NextResponse('OK')
}

export async function GET() {
  return new NextResponse('LINE Webhook OK')
}
