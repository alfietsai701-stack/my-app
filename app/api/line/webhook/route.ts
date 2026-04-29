import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { replyText, replyImage, replyQuickReply, replyDatePicker, sendLineMessage } from '@/lib/line'
import { getAvailableSlots as getAvailableSlotsFromDB } from '@/lib/slots'

const BASE_URL = process.env.NEXTAUTH_URL?.replace('http://localhost:3000', 'https://my-app-taupe-three-92.vercel.app') ?? 'https://my-app-taupe-three-92.vercel.app'

export const maxDuration = 30

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

// ── Signature verification ────────────────────────────────────────────────────

function verifySignature(body: string, signature: string): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET
  if (!secret) return true // skip in dev if not set
  const hash = crypto.createHmac('sha256', secret).update(body).digest('base64')
  return hash === signature
}

// ── Date/time helpers ─────────────────────────────────────────────────────────

function getDateRange(): { minDate: string; maxDate: string } {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  const pad = (n: number) => String(n).padStart(2, '0')
  const minDate = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth()+1)}-${pad(tomorrow.getDate())}`
  // max = last day of next month
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 2, 0)
  const maxDate = `${lastDay.getFullYear()}-${pad(lastDay.getMonth()+1)}-${pad(lastDay.getDate())}`
  return { minDate, maxDate }
}

async function getAvailableSlots(date: string, durationMin: number): Promise<string[]> {
  return getAvailableSlotsFromDB(date, durationMin)
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
    await replyQuickReply(token, '請從以下選項選擇服務類別：', [
      { label: '身體按摩', text: '身體按摩' },
      { label: '臉部護理', text: '臉部護理' },
      { label: '特別療癒套組', text: '特別療癒套組' },
    ])
    return
  }
  const services = await prisma.service.findMany({ where: { category: text }, orderBy: { price: 'asc' } })
  if (services.length === 0) {
    await replyQuickReply(token, '此類別目前無可預約服務，請選擇其他類別：', [
      { label: '身體按摩', text: '身體按摩' },
      { label: '臉部護理', text: '臉部護理' },
      { label: '特別療癒套組', text: '特別療癒套組' },
    ])
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
  await saveSession(lineUserId, 'SELECT_DATE', {
    ...data,
    serviceId:       service.id,
    serviceName:     service.name,
    servicePrice:    service.price,
    serviceDuration: service.durationMin,
  })
  const { minDate, maxDate } = getDateRange()
  await replyDatePicker(token, `已選：${service.name}（${service.durationMin}分鐘）\n請點選按鈕選擇預約日期：`, minDate, maxDate)
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
  const slots = await getAvailableSlots(date, data.serviceDuration ?? 60)
  if (slots.length === 0) {
    await replyDatePicker(token, `${date} 當天已無可預約時段，請選擇其他日期：`, minDate, maxDate)
    return
  }
  await saveSession(lineUserId, 'SELECT_TIME', { ...data, date })
  await replyQuickReply(token, `${date} 可預約時段：`, slots.map(s => ({ label: s, text: s })))
}

async function handleSelectTime(token: string, lineUserId: string, text: string, data: BookingData) {
  const businessSlots = await getAvailableSlotsFromDB(data.date ?? '', data.serviceDuration ?? 60)
  if (!businessSlots.includes(text)) {
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
  await saveSession(lineUserId, 'ASK_NOTE', { ...data, phone })
  await replyQuickReply(token, '最後，請問有什麼需要特別告知的事項嗎？\n（例如：身體狀況、過敏史、特殊需求等）', [
    { label: '略過', text: '略過' },
  ])
}

async function handleAskNote(token: string, lineUserId: string, text: string, data: BookingData) {
  const note = text === '略過' ? null : text
  const updated = { ...data, note: note ?? undefined }
  await saveSession(lineUserId, 'CONFIRM', updated)

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
  const summary = summaryLines.join('\n')

  await replyQuickReply(token, summary + '\n\n以上資訊是否正確？', [
    { label: '✅ 確認預約', text: '確認預約' },
    { label: '🔄 重新開始', text: '重新開始' },
  ])
}

async function handleConfirm(token: string, lineUserId: string, data: BookingData) {
  const { serviceId, serviceName, date, time, name, phone, note } = data
  if (!serviceId || !date || !time || !name || !phone) {
    await replyText(token, '資料不完整，請重新預約。')
    await resetSession(lineUserId)
    return
  }

  // Upsert customer — handles both new and soft-deleted customers
  const customer = await prisma.customer.upsert({
    where:  { phone },
    update: { deletedAt: null },
    create: { name, phone },
  })

  // Store as UTC: Taiwan is UTC+8, so subtract 8 hours
  const [y, m, d] = date.split('-').map(Number)
  const [h, min]  = time.split(':').map(Number)
  const scheduledAt = new Date(Date.UTC(y, m - 1, d, h - 8, min, 0))

  const appt = await prisma.appointment.create({
    data: { customerId: customer.id, serviceId, scheduledAt, note: note ? `（LINE 預約）${note}` : '（LINE 預約）' },
  })

  const [ym, mm, dd] = date.split('-')
  const successMsg =
    `✅ 預約成功！\n\n${name} 您好，您的預約已確認：\n` +
    `服務：${serviceName}\n` +
    `日期：${ym}年${mm}月${dd}日 ${time}\n\n` +
    `如需更改請來電，期待為您服務 🌿`

  // Parallelize: reset session + reply to user + notify admin
  await Promise.all([
    resetSession(lineUserId),
    replyText(token, successMsg),
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
    // ── Postback (datetime picker) ──────────────────────────────────────────
    if (event.type === 'postback') {
      const lineUserId = event.source?.userId as string
      const replyToken = event.replyToken as string
      if (!lineUserId || !replyToken) continue

      if (event.postback?.data === 'SELECT_DATE' && event.postback?.params?.date) {
        const { step, data } = await getSession(lineUserId)
        if (step === 'SELECT_DATE') {
          try {
            await handleSelectDate(replyToken, lineUserId, event.postback.params.date, data)
          } catch (err) {
            console.error('LINE postback error:', err)
            await replyText(replyToken, '發生錯誤，請稍後再試。').catch(() => {})
          }
        }
      }
      continue
    }

    // ── Message ─────────────────────────────────────────────────────────────
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

    const { step, data } = await getSession(lineUserId)

    // Only respond if user is in the middle of a booking flow
    if (step === 'START') continue

    // Allow reset at any step during active booking
    if (['重新開始', '取消', '離開'].includes(text)) {
      await resetSession(lineUserId)
      continue
    }

    try {
      switch (step) {
        case 'SELECT_CATEGORY':  await handleSelectCategory(replyToken, lineUserId, text, data);  break
        case 'SELECT_SERVICE':   await handleSelectService(replyToken, lineUserId, text, data);   break
        case 'SELECT_DATE': {
          // User typed instead of using the picker — re-show the picker
          const { minDate, maxDate } = getDateRange()
          await replyDatePicker(replyToken, '請點選按鈕選擇預約日期：', minDate, maxDate)
          break
        }
        case 'SELECT_TIME':      await handleSelectTime(replyToken, lineUserId, text, data);      break
        case 'ASK_NAME':         await handleAskName(replyToken, lineUserId, text, data);         break
        case 'ASK_PHONE':        await handleAskPhone(replyToken, lineUserId, text, data);        break
        case 'ASK_NOTE':         await handleAskNote(replyToken, lineUserId, text, data);         break
        case 'CONFIRM':
          if (text === '確認預約') await handleConfirm(replyToken, lineUserId, data)
          else { await resetSession(lineUserId) }
          break
      }
    } catch (err) {
      console.error('LINE webhook error:', err)
      await replyText(replyToken, '系統忙碌，請稍後再傳一次。').catch(() => {})
    }
  }

  return new NextResponse('OK')
}

// LINE verification endpoint
export async function GET() {
  return new NextResponse('LINE Webhook OK')
}
