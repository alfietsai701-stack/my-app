import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendBookingEmail } from '@/lib/email'
import { sendLineMessage, sendLineToUser } from '@/lib/line'
import { getAvailableSlots } from '@/lib/slots'

const BUSINESS_NAME = process.env.LINE_BUSINESS_NAME ?? '美業管理系統'

export async function POST(req: NextRequest) {
  const { serviceId, date, time, name, phone, email, note, lineUserId } = await req.json()

  if (!serviceId || !date || !time || !name || !phone) {
    return NextResponse.json({ error: '請填寫所有必填欄位' }, { status: 400 })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return NextResponse.json({ error: '日期或時間格式錯誤' }, { status: 400 })
  }
  if (!/^09\d{8}$/.test(phone.replace(/[-\s]/g, ''))) {
    return NextResponse.json({ error: '手機號碼格式錯誤' }, { status: 400 })
  }

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { id: true, name: true, price: true, durationMin: true },
  })
  if (!service) return NextResponse.json({ error: '服務不存在' }, { status: 400 })

  const cleanPhone = phone.replace(/[-\s]/g, '')

  // Upsert customer — update email/lineUserId if provided (outside tx; idempotent)
  const updateData: Record<string, unknown> = { deletedAt: null }
  if (email) updateData.email = email
  if (lineUserId) updateData.lineUserId = lineUserId

  const customer = await prisma.customer.upsert({
    where:  { phone: cleanPhone },
    update: updateData,
    create: { name, phone: cleanPhone, email: email || undefined, lineUserId: lineUserId || undefined },
    select: { id: true },
  })

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
  ].filter(l => l !== null && (l !== '' || true)).join('\n').replace(/\n{3,}/g, '\n\n')

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
