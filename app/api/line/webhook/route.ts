import { NextRequest, NextResponse, after } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { replyText, replyImage, replyQuickReply, replyDatePicker, sendLineMessage } from '@/lib/line'
import { getAvailableSlots as getAvailableSlotsFromDB } from '@/lib/slots'

export const maxDuration = 30

const BASE_URL = process.env.NEXTAUTH_URL?.replace('http://localhost:3000', 'https://my-app-taupe-three-92.vercel.app') ?? 'https://my-app-taupe-three-92.vercel.app'

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 'START' | 'SELECT_CATEGORY' | 'SELECT_SERVICE' | 'SELECT_DATE' | 'SELECT_TIME' | 'ASK_NAME' | 'ASK_PHONE' | 'ASK_NOTE' | 'CONFIRM'

type BookingData = {
  category?:        string
  serviceId?:       string
  serviceName?:     string
  servicePrice?:    number
  serviceDuration?: number
  date?:            string  // YYYY-MM-DD
  time?:            string  // HH:MM
  name?:            string
  phone?:           string
  note?:            string
}

type CachedService = { id: string; name: string; price: number; durationMin: number; category: string }

// ── In-memory service cache ───────────────────────────────────────────────────

let _svcCache: { byCategory: Map<string, CachedService[]>; at: number } | null = null
const SVC_TTL = 10 * 60 * 1000

async function loadServiceCache(): Promise<void> {
  const all = await prisma.service.findMany({
    select: { id: true, name: true, price: true, durationMin: true, category: true },
    orderBy: { price: 'asc' },
  })
  const map = new Map<string, CachedService[]>()
  for (const s of all) {
    const list = map.get(s.category) ?? []
    list.push(s)
    map.set(s.category, list)
  }
  _svcCache = { byCategory: map, at: Date.now() }
}

async function getServicesForCategory(category: string): Promise<CachedService[]> {
  if (!_svcCache || Date.now() - _svcCache.at > SVC_TTL) await loadServiceCache()
  return _svcCache!.byCategory.get(category) ?? []
}

function findService(name: string, category: string): CachedService | undefined {
  return _svcCache?.byCategory.get(category)?.find(s => s.name === name)
}

// ── Signature verification ────────────────────────────────────────────────────

function verifySignature(body: string, signature: string): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET
  if (!secret) return true
  const hash = crypto.createHmac('sha256', secret).update(body).digest('base64')
  return hash === signature
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function getDateRange(): { minDate: string; maxDate: string } {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  const pad = (n: number) => String(n).padStart(2, '0')
  const minDate = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth()+1)}-${pad(tomorrow.getDate())}`
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 2, 0)
  const maxDate = `${lastDay.getFullYear()}-${pad(lastDay.getMonth()+1)}-${pad(lastDay.getDate())}`
  return { minDate, maxDate }
}

// ── Session helpers ───────────────────────────────────────────────────────────

async function getSession(lineUserId: string): Promise<{ step: Step; data: BookingData }> {
  const s = await prisma.lineSession.findUnique({ where: { lineUserId } })
  return { step: (s?.step ?? 'START') as Step, data: (s?.data ?? {}) as BookingData }
}

async function saveSession(lineUserId: string, step: Step, data: BookingData) {
  await prisma.lineSession.upsert({
    where:  { lineUserId },
    create: { lineUserId, step, data: data as object },
    update: { step, data: data as object },
  })
}

async function resetSession(lineUserId: string) {
  await prisma.lineSession.deleteMany({ where: { lineUserId } })
}

// ── Step handlers ─────────────────────────────────────────────────────────────

const CATEGORIES = ['身體按摩', '臉部護理', '特別療癒套組']

async function handleStart(token: string, lineUserId: string) {
  // saveSession upserts — no need to delete first; warm service cache in parallel
  await Promise.all([
    saveSession(lineUserId, 'SELECT_CATEGORY', {}),
    replyQuickReply(token, '您好！歡迎預約 Ada 慢療室 🌿\n請選擇服務類別：', [
      { label: '身體按摩', text: '身體按摩' },
      { label: '臉部護理', text: '臉部護理' },
      { label: '特別療癒套組', text: '特別療癒套組' },
    ]),
    // warm cache so next step hits memory, not DB
    (_svcCache && Date.now() - _svcCache.at < SVC_TTL) ? Promise.resolve() : loadServiceCache(),
  ])
}

async function handleSelectCategory(token: string, lineUserId: string, text: string, data: BookingData) {
  if (!CATEGORIES.includes(text)) {
    await replyQuickReply(token, '請從以下選項選擇服務類別：', [
      { label: '身體按摩', text: '身體按摩' },
      { label: '臉部護理', text: '臉部護理' },
      { label: '特別療癒套組', text: '特別療癒套組' },
    ])
    return
  }
  const services = await getServicesForCategory(text)
  if (services.length === 0) {
    await replyQuickReply(token, '此類別目前無可預約服務，請選擇其他類別：', [
      { label: '身體按摩', text: '身體按摩' },
      { label: '臉部護理', text: '臉部護理' },
      { label: '特別療癒套組', text: '特別療癒套組' },
    ])
    return
  }
  await Promise.all([
    saveSession(lineUserId, 'SELECT_SERVICE', { ...data, category: text }),
    replyQuickReply(token, '請選擇服務項目：', services.map(s => ({
      label: `${s.name}（${s.durationMin}分）`.slice(0, 20),
      text: s.name,
    }))),
  ])
}

async function handleSelectService(token: string, lineUserId: string, text: string, data: BookingData) {
  // Try cache first; fall back to DB if cache miss
  const service = findService(text, data.category ?? '')
    ?? await prisma.service.findFirst({ where: { name: text, category: data.category } })
  if (!service) {
    await replyText(token, '找不到該服務，請重新選擇。')
    return
  }
  const { minDate, maxDate } = getDateRange()
  await Promise.all([
    saveSession(lineUserId, 'SELECT_DATE', {
      ...data,
      serviceId:       service.id,
      serviceName:     service.name,
      servicePrice:    service.price,
      serviceDuration: service.durationMin,
    }),
    replyDatePicker(token, `已選：${service.name}（${service.durationMin}分鐘）\n請點選按鈕選擇預約日期：`, minDate, maxDate),
  ])
}

async function handleSelectDate(token: string, lineUserId: string, date: string, data: BookingData) {
  const { minDate, maxDate } = getDateRange()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    await replyDatePicker(token, '請點選按鈕選擇預約日期：', minDate, maxDate)
    return
  }
  const [y, m, d] = date.split('-').map(Number)
  if (new Date(y, m - 1, d).getDay() === 0) {
    await replyDatePicker(token, '週日公休，請選擇其他日期：', minDate, maxDate)
    return
  }
  const slots = await getAvailableSlotsFromDB(date, data.serviceDuration ?? 60)
  if (slots.length === 0) {
    await replyDatePicker(token, `${date} 當天已無可預約時段，請選擇其他日期：`, minDate, maxDate)
    return
  }
  await Promise.all([
    saveSession(lineUserId, 'SELECT_TIME', { ...data, date }),
    replyQuickReply(token, `${date} 可預約時段：`, slots.map(s => ({ label: s, text: s }))),
  ])
}

async function handleSelectTime(token: string, lineUserId: string, text: string, data: BookingData) {
  if (!/^\d{2}:\d{2}$/.test(text)) {
    await replyText(token, '請從選項中選擇時間。')
    return
  }
  await Promise.all([
    saveSession(lineUserId, 'ASK_NAME', { ...data, time: text }),
    replyText(token, '請問您的姓名？（直接輸入文字即可）'),
  ])
}

async function handleAskName(token: string, lineUserId: string, text: string, data: BookingData) {
  if (text.length < 2 || text.length > 20) {
    await replyText(token, '請輸入正確姓名（2～20 字）。')
    return
  }
  await Promise.all([
    saveSession(lineUserId, 'ASK_PHONE', { ...data, name: text }),
    replyText(token, '請問您的聯絡電話？'),
  ])
}

async function handleAskPhone(token: string, lineUserId: string, text: string, data: BookingData) {
  const phone = text.replace(/[-\s]/g, '')
  if (!/^09\d{8}$/.test(phone)) {
    await replyText(token, '請輸入正確的手機號碼（格式：09xxxxxxxx）。')
    return
  }
  await Promise.all([
    saveSession(lineUserId, 'ASK_NOTE', { ...data, phone }),
    replyQuickReply(token, '最後，請問有什麼需要特別告知的事項嗎？\n（例如：身體狀況、過敏史、特殊需求等）', [
      { label: '略過', text: '略過' },
    ]),
  ])
}

async function handleAskNote(token: string, lineUserId: string, text: string, data: BookingData) {
  const note = text === '略過' ? undefined : text
  const updated = { ...data, note }

  const [y, m, d] = (updated.date ?? '').split('-')
  const summaryLines = [
    `📋 預約確認`,
    ``,
    `服務：${updated.serviceName}`,
    `日期：${y}年${m}月${d}日`,
    `時間：${updated.time}`,
    `時長：${updated.serviceDuration} 分鐘`,
    `費用：NT$ ${updated.servicePrice?.toLocaleString()}`,
    `姓名：${updated.name}`,
    `電話：${updated.phone}`,
  ]
  if (updated.note) summaryLines.push(`備註：${updated.note}`)

  await Promise.all([
    saveSession(lineUserId, 'CONFIRM', updated),
    replyQuickReply(token, summaryLines.join('\n') + '\n\n以上資訊是否正確？', [
      { label: '✅ 確認預約', text: '確認預約' },
      { label: '🔄 重新開始', text: '重新開始' },
    ]),
  ])
}

async function handleConfirm(token: string, lineUserId: string, data: BookingData) {
  const { serviceId, serviceName, date, time, name, phone, note } = data
  if (!serviceId || !date || !time || !name || !phone) {
    await Promise.all([
      replyText(token, '資料不完整，請重新預約。'),
      resetSession(lineUserId),
    ])
    return
  }

  // Upsert customer then create appointment (sequential: appointment needs customerId)
  const customer = await prisma.customer.upsert({
    where:  { phone },
    update: { deletedAt: null },
    create: { name, phone },
    select: { id: true },
  })

  // Store in UTC: Taiwan is UTC+8
  const [y, m, d] = date.split('-').map(Number)
  const [h, min]  = time.split(':').map(Number)
  const scheduledAt = new Date(Date.UTC(y, m - 1, d, h - 8, min, 0))

  const appt = await prisma.appointment.create({
    data: { customerId: customer.id, serviceId, scheduledAt, note: note ? `（LINE 預約）${note}` : '（LINE 預約）' },
    select: { id: true },
  })

  const [ym, mm, dd] = date.split('-')
  await Promise.all([
    resetSession(lineUserId),
    replyText(token,
      `✅ 預約成功！\n\n${name} 您好，您的預約已確認：\n` +
      `服務：${serviceName}\n` +
      `日期：${ym}年${mm}月${dd}日 ${time}\n\n` +
      `如需更改請來電，期待為您服務 🌿`
    ),
    sendLineMessage(
      `📅 新預約（LINE）\n顧客：${name}（${phone}）\n服務：${serviceName}\n時間：${date} ${time}\n預約編號：${appt.id.slice(-6)}`
    ).catch(() => {}),
  ])
}

// ── Menu handlers ─────────────────────────────────────────────────────────────

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
  await replyText(token, '🔗 Ada 慢療室 官方連結\n\n📸 Instagram\nhttps://www.instagram.com/ada_studio_2026/')
}

const MENU_KEYWORDS: Record<string, (token: string, lineUserId: string) => Promise<void>> = {
  '__PRICE__':   (t)    => handlePriceList(t),
  '__NOTES__':   (t)    => handleNotes(t),
  '__PROMO__':   (t)    => handlePromotion(t),
  '__LINKS__':   (t)    => handleLinks(t),
  '__BOOKING__': (t, u) => handleStart(t, u),
}

// ── Event processor ───────────────────────────────────────────────────────────

async function processEvent(event: unknown) {
  const ev = event as Record<string, unknown>

  // ── Postback (datetime picker) ────────────────────────────────────────
  if (ev.type === 'postback') {
    const lineUserId = (ev.source as Record<string, string>)?.userId
    const replyToken = ev.replyToken as string
    if (!lineUserId || !replyToken) return

    const postback = ev.postback as Record<string, unknown>
    if (postback?.data === 'SELECT_DATE' && (postback?.params as Record<string, string>)?.date) {
      const selectedDate = (postback.params as Record<string, string>).date
      const { step, data } = await getSession(lineUserId)
      if (step === 'SELECT_DATE') {
        try {
          await handleSelectDate(replyToken, lineUserId, selectedDate, data)
        } catch (err) {
          console.error('LINE postback error:', err)
          await replyText(replyToken, '系統忙碌，請稍後再試一次。').catch(() => {})
        }
      }
    }
    return
  }

  // ── Text message ─────────────────────────────────────────────────────
  if ((ev.type as string) !== 'message') return
  const msg = ev.message as Record<string, unknown>
  if (msg?.type !== 'text') return

  const lineUserId = (ev.source as Record<string, string>)?.userId
  const replyToken = ev.replyToken as string
  const text       = (msg.text as string).trim()
  if (!lineUserId || !replyToken) return

  if (text in MENU_KEYWORDS) {
    // __BOOKING__ calls handleStart which upserts session — no separate reset needed
    await MENU_KEYWORDS[text](replyToken, lineUserId)
    return
  }

  const { step, data } = await getSession(lineUserId)
  if (step === 'START') return

  if (['重新開始', '取消', '離開'].includes(text)) {
    await resetSession(lineUserId)
    return
  }

  try {
    switch (step) {
      case 'SELECT_CATEGORY': await handleSelectCategory(replyToken, lineUserId, text, data); break
      case 'SELECT_SERVICE':  await handleSelectService(replyToken, lineUserId, text, data);  break
      case 'SELECT_DATE': {
        const { minDate, maxDate } = getDateRange()
        await replyDatePicker(replyToken, '請點選按鈕選擇預約日期：', minDate, maxDate)
        break
      }
      case 'SELECT_TIME': await handleSelectTime(replyToken, lineUserId, text, data); break
      case 'ASK_NAME':    await handleAskName(replyToken, lineUserId, text, data);   break
      case 'ASK_PHONE':   await handleAskPhone(replyToken, lineUserId, text, data);  break
      case 'ASK_NOTE':    await handleAskNote(replyToken, lineUserId, text, data);   break
      case 'CONFIRM':
        if (text === '確認預約') await handleConfirm(replyToken, lineUserId, data)
        else await resetSession(lineUserId)
        break
    }
  } catch (err) {
    console.error('LINE webhook error:', err)
    await replyText(replyToken, '系統忙碌，請稍後再傳一次。').catch(() => {})
  }
}

async function processEvents(events: unknown[]) {
  // Events from the same user are rare to batch; parallel processing is safe
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

  // Return 200 immediately; process events in background
  after(async () => {
    await processEvents(events)
  })

  return new NextResponse('OK')
}

export async function GET() {
  return new NextResponse('LINE Webhook OK')
}
