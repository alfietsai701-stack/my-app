import { NextResponse } from 'next/server'
import { getBusinessHours } from '@/lib/business-hours'

// 公開端點：預約前端用來判斷哪些日期公休（不含敏感資料）
export async function GET() {
  const hours = await getBusinessHours()
  return NextResponse.json(hours)
}
