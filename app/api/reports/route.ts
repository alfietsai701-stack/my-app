import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

  // Last 6 months range
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  const [
    receiptsThisMonth,
    receiptsLastMonth,
    appointmentsThisMonth,
    appointmentsLastMonth,
    receipts6m,
    allAppointments,
  ] = await Promise.all([
    prisma.receipt.findMany({ where: { paidAt: { gte: thisMonthStart } }, include: { appointment: { include: { service: true } } } }),
    prisma.receipt.findMany({ where: { paidAt: { gte: lastMonthStart, lte: lastMonthEnd } } }),
    prisma.appointment.count({ where: { scheduledAt: { gte: thisMonthStart } } }),
    prisma.appointment.count({ where: { scheduledAt: { gte: lastMonthStart, lte: lastMonthEnd } } }),
    prisma.receipt.findMany({ where: { paidAt: { gte: sixMonthsAgo } }, include: { appointment: { include: { service: true } } } }),
    prisma.appointment.findMany({ where: { scheduledAt: { gte: sixMonthsAgo } }, include: { service: true, receipt: true } }),
  ])

  // Revenue by month (last 6 months)
  const monthlyRevenue: Record<string, number> = {}
  const monthlyAppointments: Record<string, number> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`
    monthlyRevenue[key] = 0
    monthlyAppointments[key] = 0
  }
  receipts6m.forEach(r => {
    const d = new Date(r.paidAt)
    const key = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`
    if (key in monthlyRevenue) monthlyRevenue[key] += r.total
  })
  allAppointments.forEach(a => {
    const d = new Date(a.scheduledAt)
    const key = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`
    if (key in monthlyAppointments) monthlyAppointments[key] = (monthlyAppointments[key] || 0) + 1
  })

  // Top services
  const serviceCount: Record<string, { name: string; count: number; revenue: number }> = {}
  receipts6m.forEach(r => {
    const svc = r.appointment.service
    if (!serviceCount[svc.id]) serviceCount[svc.id] = { name: svc.name, count: 0, revenue: 0 }
    serviceCount[svc.id].count += 1
    serviceCount[svc.id].revenue += r.total
  })
  const topServices = Object.values(serviceCount).sort((a, b) => b.count - a.count).slice(0, 5)

  // Pay method breakdown
  const payMethods: Record<string, number> = {}
  receiptsThisMonth.forEach(r => {
    payMethods[r.payMethod] = (payMethods[r.payMethod] || 0) + r.total
  })

  const revenueThisMonth = receiptsThisMonth.reduce((s, r) => s + r.total, 0)
  const revenueLastMonth = receiptsLastMonth.reduce((s, r) => s + r.total, 0)

  return NextResponse.json({
    revenueThisMonth,
    revenueLastMonth,
    appointmentsThisMonth,
    appointmentsLastMonth,
    monthlyRevenue: Object.entries(monthlyRevenue).map(([month, revenue]) => ({
      month: month.slice(5) + '月',
      revenue,
      appointments: monthlyAppointments[month] || 0,
    })),
    topServices,
    payMethods: Object.entries(payMethods).map(([method, total]) => ({ method, total })),
  })
}
