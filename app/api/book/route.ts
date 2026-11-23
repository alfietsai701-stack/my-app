import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendBookingEmail } from '@/lib/email'
import { sendLineMessage, sendLineToUser } from '@/lib/line'
import { getAvailableSlots } from '@/lib/slots'
import { verifyLineIdToken } from '@/lib/line-auth'
import { rateLimit, clientIp } from '@/lib/rate-limit'

const BUSINESS_NAME = process.env.LINE_BUSINESS_NAME ?? '美業管理系統'

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const sameName = (a: string, b: string) => a.replace(/\s/g, '').toLowerCase() === b.replace(/\s/g, '').toLowerCase()

function tooMany(retryAfterSec: number) {
  return NextResponse.json(
    { error: '送出次數過多，請稍後再試，或直接透過 LINE 與我們聯繫' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
  )
}

export async function POST(req: NextRequest) {
  // 同一來源 10 分鐘最多 10 次，擋掉腳本灌單／濫發確認信
  const ipLimit = rateLimit(`book:ip:${clientIp(req)}`, 10, 10 * 60 * 1000)
  if (!ipLimit.ok) return tooMany(ipLimit.retryAfterSec)

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: '請求格式錯誤' }, { status: 400 })
  }
  const serviceId = str(body.serviceId)
  const date  = str(body.date)
  const time  = str(body.time)
  const name  = str(body.name)
  const phone = str(body.phone)
  const email = str(body.email)
  const note  = str(body.note)

  if (!serviceId || !date || !time || !name || !phone) {
    return NextResponse.json({ error: '請填寫所有必填欄位' }, { status: 400 })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return NextResponse.json({ error: '日期或時間格式錯誤' }, { status: 400 })
  }
  if (!/^09\d{8}$/.test(phone.replace(/[-\s]/g, ''))) {
    return NextResponse.json({ error: '手機號碼格式錯誤' }, { status: 400 })
  }
  if (name.length > 50) {
    return NextResponse.json({ error: '姓名過長（最多 50 字）' }, { status: 400 })
  }
  if (note.length > 500) {
    return NextResponse.json({ error: '備註過長（最多 500 字）' }, { status: 400 })
  }
  if (email && (email.length > 254 || !/^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(email))) {
    return NextResponse.json({ error: 'Email 格式錯誤' }, { status: 400 })
  }

  const cleanPhone = phone.replace(/[-\s]/g, '')

  // 同一支手機 1 小時最多 5 次
  const phoneLimit = rateLimit(`book:phone:${cleanPhone}`, 5, 60 * 60 * 1000)
  if (!phoneLimit.ok) return tooMany(phoneLimit.retryAfterSec)

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { id: true, name: true, price: true, durationMin: true },
  })
  if (!service) return NextResponse.json({ error: '服務不存在' }, { status: 400 })

  // 只信任向 LINE 驗證過的身分；前端直接送來的 userId 一律不採用
  const lineUserId = await verifyLineIdToken(body.idToken)

  const customer = await resolveCustomer({ name, phone: cleanPhone, email, lineUserId })

  // Advisory-lock + atomic check-and-create inside a single transaction.
  // pg_advisory_xact_lock serialises concurrent requests for the same date,
  // eliminating the TOCTOU race condition that would cause double-booking.
  let appt: { id: string }
  try {
    appt = await prisma.$transaction(async (tx) => {
      // Lock this date exclusively — released automatically when the transaction ends
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${date}))`

      const availableSlots = await getAvailableSlots(date, service.durationMin, tx)
      if (!availableSlots.includes(time)) {
        throw Object.assign(new Error('slot_taken'), { slotTaken: true })
      }

      const [y, m, d] = date.split('-').map(Number)
      const [h, min]  = time.split(':').map(Number)
      const scheduledAt = new Date(Date.UTC(y, m - 1, d, h - 8, min, 0))

      return tx.appointment.create({
        data: {
          customerId: customer.id,
          serviceId,
          scheduledAt,
          note: note ? `（網路預約）${note}` : '（網路預約）',
        },
        select: { id: true },
      })
    }, { timeout: 10_000 })
  } catch (err) {
    if (err && typeof err === 'object' && 'slotTaken' in err) {
      return NextResponse.json({ error: '此時段已被預約，請重新選擇其他時間' }, { status: 409 })
    }
    throw err
  }

  const [ym, mm, dd] = date.split('-')
  const dateStr = `${ym}年${mm}月${dd}日`
  const apptCode = appt.id.slice(-6).toUpperCase()

  // Confirmation message for customer
  const customerMsg = [
    `✅ 預約確認！`,
    ``,
    `${name}，您好！`,
    `您在 ${BUSINESS_NAME} 的預約已確認：`,
    ``,
    `📋 服務：${service.name}`,
    `📅 日期：${dateStr}`,
    `⏰ 時間：${time}`,
    `⌛ 時長：${service.durationMin} 分鐘`,
    `💰 費用：NT$ ${service.price.toLocaleString()}`,
    note ? `📝 備註：${note}` : '',
    ``,
    `預約編號：${apptCode}`,
    `如需更改或取消，請與我們聯繫。`,
    `期待為您服務 🌿`,
  ].join('\n').replace(/\n{3,}/g, '\n\n')

  // Admin notification
  const adminMsg = `📅 新預約（網路）\n顧客：${name}（${cleanPhone}）\n服務：${service.name}\n時間：${date} ${time}\n預約編號：${apptCode}`

  await Promise.all([
    email ? sendBookingEmail({ to: email, name, serviceName: service.name, date, time, durationMin: service.durationMin, price: service.price, note }) : Promise.resolve(),
    lineUserId ? sendLineToUser(lineUserId, customerMsg).catch(() => {}) : Promise.resolve(),
    sendLineMessage(adminMsg).catch(() => {}),
  ])

  return NextResponse.json({
    id: appt.id,
    code: apptCode,
    service: service.name,
    date,
    time,
  }, { status: 201 })
}

/**
 * 找出或建立這筆預約的顧客，並依規則決定是否綁定 LINE／更新 Email。
 *
 * 公開預約頁任何人都能輸入任意手機號碼，所以對「已存在的顧客」要保守：
 *  - LINE：只有在該顧客尚未綁定 LINE、且送出的姓名與資料庫一致時才綁定；
 *          已綁定別的 LINE 帳號時絕不覆寫；這個 LINE 已綁定其他顧客時也不綁。
 *  - Email：原本沒有 Email，或請求者就是已綁定的 LINE 本人，才更新。
 *  新顧客則直接建立並綁定。
 */
async function resolveCustomer(input: { name: string; phone: string; email: string; lineUserId: string | null }) {
  const { name, phone, email, lineUserId } = input

  const existing = await prisma.customer.findUnique({
    where: { phone },
    select: { id: true, name: true, email: true, lineUserId: true },
  })

  // 這個 LINE 帳號是否已綁定在「別的」顧客身上（lineUserId 為 unique）
  const lineTakenElsewhere = lineUserId
    ? !!(await prisma.customer.findFirst({
        where: { lineUserId, NOT: { phone } },
        select: { id: true },
      }))
    : false

  if (!existing) {
    try {
      return await prisma.customer.create({
        data: {
          name,
          phone,
          email: email || undefined,
          lineUserId: lineUserId && !lineTakenElsewhere ? lineUserId : undefined,
        },
        select: { id: true },
      })
    } catch {
      // 同一支手機剛好被併發建立：改用既有資料，不做任何覆寫
      return prisma.customer.findUniqueOrThrow({ where: { phone }, select: { id: true } })
    }
  }

  const isOwner = !!lineUserId && existing.lineUserId === lineUserId
  const data: { deletedAt: null; email?: string; lineUserId?: string } = { deletedAt: null }
  if (email && (!existing.email || isOwner)) data.email = email
  if (lineUserId && !existing.lineUserId && !lineTakenElsewhere && sameName(existing.name, name)) {
    data.lineUserId = lineUserId
  }

  return prisma.customer.update({ where: { id: existing.id }, data, select: { id: true } })
}
