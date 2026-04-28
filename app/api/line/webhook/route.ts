import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { replyText, replyImage, replyQuickReply, sendLineMessage } from '@/lib/line'
import { getBusinessSlots } from '@/lib/slots'

const BASE_URL = process.env.NEXTAUTH_URL?.replace('http://localhost:3000', 'https://my-app-taupe-three-92.vercel.app') ?? 'https://my-app-taupe-three-92.vercel.app'

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 'START' | 'SELECT_CATEGORY' | 'SELECT_SERVICE' | 'SELECT_DATE' | 'SELECT_TIME' | 'ASK_NAME' | 'ASK_PHONE' | 'CONFIRM'

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
}

// ── Signature verification ────────────────────────────────────────────────────

function verifySignature(body: string, signature: string): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET
  if (!secret) return true // skip in dev if not set
  const hash = crypto.createHmac('sha256', secret).update(body).digest('base64')
  return hash === signature
}

// ── Date/time helpers ─────────────────────────────────────────────────────────

// Slots loaded from DB at runtime via getBusinessSlots()

function getUpcomingDates(count = 7): { label: string; value: string }[] {
  const dates = []
  const now = new Date()
  for (let i = 1; i <= count + 3 && dates.length < count; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    const dow = d.getDay()
    if (dow === 0) continue // skip Sunday (adjust for your business)
    const value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    const label = `${d.getMonth()+1}/${d.getDate()}（${['日','一','二','三','四','五','六'][dow]}）`
    dates.push({ label, value })
  }
  return dates
}

async function getAvailableSlots(date: string, durationMin: number): Promise<string[]> {
  const [y, m, day] = date.split('-').map(Number)
  const start = new Date(y, m-1, day, 0, 0, 0)
  const end   = new Date(y, m-1, day, 23, 59, 59)

  const [businessSlots, appts] = await Promise.all([
    getBusinessSlots(),
    prisma.appointment.findMany({
      where: { scheduledAt: { gte: start, lte: end }, status: { not: 'cancelled' } },
      include: { service: { select: { durationMin: true } } },
    }),
  ])

  const blocked = new Set<number>()
  appts.forEach(a => {
    const h = a.scheduledAt.getHours()
    const min = a.scheduledAt.getMinutes()
    const startMin = h * 60 + min
    const endMin   = startMin + a.service.durationMin
    for (let t = startMin; t < endMin; t += 30) blocked.add(t)
  })

  return businessSlots.filter(slot => {
    const [sh, sm] = slot.split(':').map(Number)
    const slotStart = sh * 60 + sm
    const slotEnd   = slotStart + durationMin
    for (let t = slotStart; t < slotEnd; t += 30) {
      if (blocked.has(t)) return false
    }
    return true
  })
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
  await saveSession(lineUserId, 'SELECT_CATEGORY', {})
  await replyQuickReply(token, '您好！歡迎預約 Ada 慢療室 🌿\n請選擇服務類別：', [
    { label: '身體按摩', text: '身體按摩' },
    { label: '臉部護理', text: '臉部護理' },
    { label: '特別療癒套組', text: '特別療癒套組' },
  ])
}

async function handleSelectCategory(token: string, lineUserId: string, text: string, data: BookingData) {
  if (!CATEGORIES.includes(text)) {
    await handleStart(token, lineUserId)
    return
  }
  const services = await prisma.service.findMany({ where: { category: text }, orderBy: { price: 'asc' } })
  if (services.length === 0) {
    await replyText(token, '此類別目前無可預約服務，請選擇其他類別。')
    await handleStart(token, lineUserId)
    return
  }
  await saveSession(lineUserId, 'SELECT_SERVICE', { ...data, category: text })
  await replyQuickReply(token, `請選擇服務項目：`, services.map(s => ({
    label: `${s.name}（${s.durationMin}分）`.slice(0, 20),
    text: s.name,
  })))
}

async function handleSelectService(token: string, lineUserId: string, text: string, data: BookingData) {
  const service = await prisma.service.findFirst({ where: { name: text, category: data.category } })
  if (!service) {
    await replyText(token, '找不到該服務，請重新選擇。')
    return
  }
  const dates = getUpcomingDates(7)
  await saveSession(lineUserId, 'SELECT_DATE', {
    ...data,
    serviceId:       service.id,
    serviceName:     service.name,
    servicePrice:    service.price,
    serviceDuration: service.durationMin,
  })
  await replyQuickReply(token, `已選：${service.name}（${service.durationMin}分鐘）\n請選擇預約日期：`,
    dates.map(d => ({ label: d.label, text: d.value }))
  )
}

async function handleSelectDate(token: string, lineUserId: string, text: string, data: BookingData) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    await replyText(token, '請從選項中選擇日期。')
    return
  }
  const slots = await getAvailableSlots(text, data.serviceDuration ?? 60)
  if (slots.length === 0) {
    await replyText(token, `${text} 當天已無可預約時段，請選擇其他日期。`)
    const dates = getUpcomingDates(7)
    await replyQuickReply(token, '請重新選擇日期：', dates.map(d => ({ label: d.label, text: d.value })))
    return
  }
  await saveSession(lineUserId, 'SELECT_TIME', { ...data, date: text })
  await replyQuickReply(token, `${text} 可預約時段：`, slots.map(s => ({ label: s, text: s })))
}

async function handleSelectTime(token: string, lineUserId: string, text: string, data: BookingData) {
  if (!BUSINESS_HOURS.includes(text)) {
    await replyText(token, '請從選項中選擇時間。')
    return
  }
  await saveSession(lineUserId, 'ASK_NAME', { ...data, time: text })
  await replyText(token, '請問您的姓名？（直接輸入文字即可）')
}

async function handleAskName(token: string, lineUserId: string, text: string, data: BookingData) {
  if (text.length < 2 || text.length > 20) {
    await replyText(token, '請輸入正確姓名（2～20 字）。')
    return
  }
  await saveSession(lineUserId, 'ASK_PHONE', { ...data, name: text })
  await replyText(token, '請問您的聯絡電話？')
}

async function handleAskPhone(token: string, lineUserId: string, text: string, data: BookingData) {
  const phone = text.replace(/[-\s]/g, '')
  if (!/^09\d{8}$/.test(phone)) {
    await replyText(token, '請輸入正確的手機號碼（格式：09xxxxxxxx）。')
    return
  }
  const updated = { ...data, phone }
  await saveSession(lineUserId, 'CONFIRM', updated)

  const [y, m, d] = (updated.date ?? '').split('-')
  const summary = [
    `📋 預約確認`,
    ``,
    `服務：${updated.serviceName}`,
    `日期：${y}年${m}月${d}日`,
    `時間：${updated.time}`,
    `時長：${updated.serviceDuration} 分鐘`,
    `費用：NT$ ${updated.servicePrice?.toLocaleString()}`,
    `姓名：${updated.name}`,
    `電話：${updated.phone}`,
  ].join('\n')

  await replyQuickReply(token, summary + '\n\n以上資訊是否正確？', [
    { label: '✅ 確認預約', text: '確認預約' },
    { label: '🔄 重新開始', text: '重新開始' },
  ])
}

async function handleConfirm(token: string, lineUserId: string, data: BookingData) {
  const { serviceId, serviceName, date, time, name, phone, servicePrice } = data
  if (!serviceId || !date || !time || !name || !phone) {
    await replyText(token, '資料不完整，請重新預約。')
    await resetSession(lineUserId)
    return
  }

  // Find or create customer
  let customer = await prisma.customer.findFirst({ where: { phone, deletedAt: null } })
  if (!customer) {
    customer = await prisma.customer.create({ data: { name, phone } })
  }

  const [y, m, d] = date.split('-').map(Number)
  const [h, min]  = time.split(':').map(Number)
  const scheduledAt = new Date(y, m-1, d, h, min, 0)

  const appt = await prisma.appointment.create({
    data: { customerId: customer.id, serviceId, scheduledAt, note: '（LINE 預約）' },
  })

  await resetSession(lineUserId)

  const [ym, mm, dd] = date.split('-')
  await replyText(token,
    `✅ 預約成功！\n\n${name} 您好，您的預約已確認：\n` +
    `服務：${serviceName}\n` +
    `日期：${ym}年${mm}月${dd}日 ${time}\n\n` +
    `如需更改請來電，期待為您服務 🌿`
  )

  // Notify admin
  await sendLineMessage(
    `📅 新預約（LINE）\n顧客：${name}（${phone}）\n服務：${serviceName}\n時間：${date} ${time}\n預約編號：${appt.id.slice(-6)}`
  ).catch(() => {})
}

// ── Menu handlers ─────────────────────────────────────────────────────────────

async function handlePriceList(token: string) {
  await replyImage(token, `${BASE_URL}/price-list.png`)
}

async function handleNotes(token: string) {
  await replyImage(token, `${BASE_URL}/booking-notes.png`)
}

async function handlePromotion(token: string) {
  await replyText(token, [
    '🎁 優惠活動',
    '',
    '目前尚無進行中的優惠活動。',
    '',
    '請持續關注我們的 LINE 官方帳號，',
    '最新消息將第一時間通知您 🌿',
  ].join('\n'))
}

async function handleLinks(token: string) {
  await replyText(token, [
    '🔗 Ada 慢療室 官方連結',
    '',
    '📸 Instagram',
    'https://www.instagram.com/ada_studio_2026/',
  ].join('\n'))
}

// ── Global menu keyword map ───────────────────────────────────────────────────

const MENU_KEYWORDS: Record<string, (token: string, lineUserId: string) => Promise<void>> = {
  '__PRICE__':     (t)       => handlePriceList(t),
  '__NOTES__':     (t)       => handleNotes(t),
  '__PROMO__':     (t)       => handlePromotion(t),
  '__LINKS__':     (t)       => handleLinks(t),
  '__BOOKING__':   (t, u)    => handleStart(t, u),
}

// ── Main webhook handler ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody  = await req.text()
  const signature = req.headers.get('x-line-signature') ?? ''

  if (!verifySignature(rawBody, signature)) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const body = JSON.parse(rawBody)

  for (const event of body.events ?? []) {
    if (event.type !== 'message' || event.message?.type !== 'text') continue

    const lineUserId  = event.source?.userId as string
    const replyToken  = event.replyToken as string
    const text        = (event.message.text as string).trim()

    if (!lineUserId || !replyToken) continue

    // Rich menu global keywords — interrupt any step
    if (text in MENU_KEYWORDS) {
      if (text === '__BOOKING__') await resetSession(lineUserId)
      await MENU_KEYWORDS[text](replyToken, lineUserId)
      continue
    }

    // Allow reset at any step
    if (['重新開始', '取消', '離開'].includes(text)) {
      await resetSession(lineUserId)
      await handleStart(replyToken, lineUserId)
      continue
    }

    const { step, data } = await getSession(lineUserId)

    try {
      switch (step) {
        case 'START':            await handleStart(replyToken, lineUserId);                              break
        case 'SELECT_CATEGORY':  await handleSelectCategory(replyToken, lineUserId, text, data);         break
        case 'SELECT_SERVICE':   await handleSelectService(replyToken, lineUserId, text, data);          break
        case 'SELECT_DATE':      await handleSelectDate(replyToken, lineUserId, text, data);             break
        case 'SELECT_TIME':      await handleSelectTime(replyToken, lineUserId, text, data);             break
        case 'ASK_NAME':         await handleAskName(replyToken, lineUserId, text, data);                break
        case 'ASK_PHONE':        await handleAskPhone(replyToken, lineUserId, text, data);               break
        case 'CONFIRM':
          if (text === '確認預約') await handleConfirm(replyToken, lineUserId, data)
          else { await resetSession(lineUserId); await handleStart(replyToken, lineUserId) }
          break
        default:                 await handleStart(replyToken, lineUserId)
      }
    } catch (err) {
      console.error('LINE webhook error:', err)
      await replyText(replyToken, '發生錯誤，請重新傳訊息開始預約。').catch(() => {})
      await resetSession(lineUserId)
    }
  }

  return new NextResponse('OK')
}

// LINE verification endpoint
export async function GET() {
  return new NextResponse('LINE Webhook OK')
}
