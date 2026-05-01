import { prisma } from '@/lib/prisma'
import { getBusinessSlots } from '@/lib/slots'
import AppointmentsClient from './AppointmentsClient'

export default async function AppointmentsPage() {
  const now   = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth()

  // Fetch current month (and neighbouring months for week view edge cases) in parallel
  const months = [
    new Date(year, month - 1, 1),
    new Date(year, month, 1),
    new Date(year, month + 1, 1),
  ].map(d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)

  const [apptsByMonth, services, slots] = await Promise.all([
    Promise.all(months.map(async m => {
      const [y, mo] = m.split('-').map(Number)
      const data = await prisma.appointment.findMany({
        where: {
          scheduledAt: { gte: new Date(y, mo - 1, 1), lte: new Date(y, mo, 0, 23, 59, 59) },
        },
        orderBy: { scheduledAt: 'asc' },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          service:  { select: { id: true, name: true, durationMin: true, price: true } },
          receipt:  true,
        },
      })
      return { m, data }
    })),
    prisma.service.findMany({ orderBy: [{ category: 'asc' }, { price: 'asc' }] }),
    getBusinessSlots(),
  ])

  const initialMonthData = Object.fromEntries(apptsByMonth.map(({ m, data }) => [m, data]))

  return (
    <AppointmentsClient
      initialMonthData={initialMonthData}
      initialServices={services}
      initialSlots={slots}
    />
  )
}
