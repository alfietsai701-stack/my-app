type BookingEmailParams = {
  to: string
  name: string
  serviceName: string
  date: string       // YYYY-MM-DD
  time: string       // HH:MM
  durationMin: number
  price: number
  note?: string
}

export async function sendBookingEmail(params: BookingEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) { console.warn('RESEND_API_KEY 未設定，略過 email'); return }

  const businessName = process.env.LINE_BUSINESS_NAME ?? '美業管理系統'
  const { to, name, serviceName, date, time, durationMin, price, note } = params
  const [y, m, d] = date.split('-')
  const dateStr = `${y}年${m}月${d}日`

  const noteRow = note
    ? `<tr><td style="padding:8px 0;color:#6478A0;font-size:14px;width:60px">備註</td><td style="padding:8px 0;color:#0F1E38;font-weight:500">${note}</td></tr>`
    : ''

  const html = `
<!DOCTYPE html>
<html lang="zh-TW">
<body style="margin:0;padding:0;background:#EFF3FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<div style="max-width:480px;margin:32px auto;border-radius:20px;overflow:hidden;box-shadow:0 4px 20px rgba(15,30,56,0.12)">
  <div style="background:linear-gradient(145deg,#1255CC,#082E80);color:white;padding:32px 24px;text-align:center">
    <div style="font-size:40px;margin-bottom:8px">✅</div>
    <h1 style="margin:0;font-size:22px;font-weight:700">預約確認</h1>
    <p style="margin:8px 0 0;opacity:0.85;font-size:14px">${businessName}</p>
  </div>
  <div style="background:white;padding:28px 24px">
    <p style="color:#0F1E38;margin:0 0 20px;font-size:15px;line-height:1.6">
      ${name}，您好！<br/>您的預約已確認，詳細資料如下：
    </p>
    <table style="width:100%;border-collapse:collapse;border-top:1px solid #E2E8F4">
      <tr><td style="padding:10px 0;color:#6478A0;font-size:14px;width:60px">服務</td><td style="padding:10px 0;color:#0F1E38;font-weight:600">${serviceName}</td></tr>
      <tr style="border-top:1px solid #E2E8F4"><td style="padding:10px 0;color:#6478A0;font-size:14px">日期</td><td style="padding:10px 0;color:#0F1E38;font-weight:600">${dateStr}</td></tr>
      <tr style="border-top:1px solid #E2E8F4"><td style="padding:10px 0;color:#6478A0;font-size:14px">時間</td><td style="padding:10px 0;color:#0F1E38;font-weight:600">${time}</td></tr>
      <tr style="border-top:1px solid #E2E8F4"><td style="padding:10px 0;color:#6478A0;font-size:14px">時長</td><td style="padding:10px 0;color:#0F1E38;font-weight:600">${durationMin} 分鐘</td></tr>
      <tr style="border-top:1px solid #E2E8F4"><td style="padding:10px 0;color:#6478A0;font-size:14px">費用</td><td style="padding:10px 0;color:#1255CC;font-weight:700">NT$ ${price.toLocaleString()}</td></tr>
      ${noteRow}
    </table>
    <div style="margin-top:24px;padding:16px;background:#EFF3FA;border-radius:12px;color:#334A6E;font-size:13px;line-height:1.6">
      如需更改或取消預約，請與我們聯繫。
    </div>
    <p style="color:#9AADC8;font-size:12px;text-align:center;margin:24px 0 0">期待為您服務 🌿</p>
  </div>
</div>
</body>
</html>`

  const from = process.env.EMAIL_FROM ?? `${businessName} <onboarding@resend.dev>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `✅ 預約確認 - ${serviceName}（${dateStr} ${time}）`,
      html,
    }),
  })
  if (!res.ok) console.error('Email 發送失敗:', res.status, await res.text())
}
