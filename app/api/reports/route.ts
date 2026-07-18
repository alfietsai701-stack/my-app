import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPermission } from '@/lib/with-auth'

export const GET = withPermission('reports', async (req: NextRequest) => {
  const monthParam = req.nextUrl.searchParams.get('month') // YYYY-MM
  const now = new Date()
  const [y, m] = monthParam
    ? monthParam.split('-').map(Number)
    : [now.getFullYear(), now.getMonth() + 1]

  const start = new Date(y, m - 1, 1)
  const end   = new Date(y, m, 0, 23, 59, 59)
  const prevStart = new Date(y, m - 2, 1)
  const prevEnd   = new Date(y, m - 1, 0, 23, 59, 59)

  const [
    receipts, prevReceipts,
    apptCount, prevAppts, completedCount,
    allAppts,
  ] = await Promise.all([
    prisma.receipt.findMany({
      where: { paidAt: { gte: start, lte: end } },
      include: { appointment: { include: { service: true } } },
    }),
    prisma.receipt.aggregate({
      where: { paidAt: { gte: prevStart, lte: prevEnd } },
      _sum: { total: true },
    }),
    prisma.appointment.count({ where: { scheduledAt: { gte: start, lte: end }, status: { not: 'cancelled' } } }),
    prisma.appointment.count({ where: { scheduledAt: { gte: prevStart, lte: prevEnd }, status: { not: 'cancelled' } } }),
    prisma.appointment.count({ where: { scheduledAt: { gte: start, lte: end }, status: 'completed' } }),
    // full year for trend (last 12 months)
    prisma.receipt.findMany({
      where: { paidAt: { gte: new Date(y, m - 13, 1) } },
      include: { appointment: { include: { service: true } } },
    }),
  ])

  const revenue = receipts.reduce((s, r) => s + r.total, 0)
  const prevRevenue = prevReceipts._sum.total ?? 0
  const avgTicket = completedCount > 0 ? Math.round(revenue / completedCount) : 0

  // Service breakdown
  const svcMap: Record<string, { name: string; category: string; count: number; revenue: number }> = {}
  receipts.forEach(r => {
    const svc = r.appointment.service
    if (!svcMap[svc.id]) svcMap[svc.id] = { name: svc.name, category: svc.category, count: 0, revenue: 0 }
    svcMap[svc.id].count += 1
    svcMap[svc.id].revenue += r.total
  })
  const services = Object.values(svcMap).sort((a, b) => b.revenue - a.revenue)

  // Category breakdown
  const catMap: Record<string, { count: number; revenue: number }> = {}
  services.forEach(s => {
    if (!catMap[s.category]) catMap[s.category] = { count: 0, revenue: 0 }
    catMap[s.category].count += s.count
    catMap[s.category].revenue += s.revenue
  })
  const categories = Object.entries(catMap)
    .map(([name, v]) => ({ name, ...v, pct: revenue > 0 ? Math.round((v.revenue / revenue) * 100) : 0 }))
    .sort((a, b) => b.revenue - a.revenue)

  // Monthly trend (12 months)
  const trend: Record<string, { revenue: number; count: number }> = {}
  for (let i = 11; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    trend[key] = { revenue: 0, count: 0 }
  }
  allAppts.forEach(r => {
    const d = new Date(r.paidAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (key in trend) { trend[key].revenue += r.total; trend[key].count += 1 }
  })
  const trendData = Object.entries(trend).map(([month, v]) => ({
    month: month.slice(5) + '月',
    fullMonth: month,
    ...v,
  }))

  return NextResponse.json({
    month: `${y}-${String(m).padStart(2, '0')}`,
    revenue, prevRevenue,
    apptCount, prevAppts, completedCount, avgTicket,
    services, categories, trendData,
  })
})
