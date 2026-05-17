import type { Prisma } from '@prisma/client'

const customerListArgs = {
  include: { _count: { select: { appointments: true } } },
} satisfies Prisma.CustomerDefaultArgs

const customerDetailArgs = {
  include: {
    appointments: {
      include: { service: true, receipt: true },
    },
    member: true,
  },
} satisfies Prisma.CustomerDefaultArgs

type CustomerListItem = Prisma.CustomerGetPayload<typeof customerListArgs>
type CustomerDetail = Prisma.CustomerGetPayload<typeof customerDetailArgs>

function iso(date: Date | null): string | null {
  return date ? date.toISOString() : null
}

export function serializeCustomer(customer: CustomerListItem) {
  return {
    ...customer,
    birthday: iso(customer.birthday),
    createdAt: customer.createdAt.toISOString(),
    deletedAt: iso(customer.deletedAt),
  }
}

export function serializeCustomerDetail(customer: CustomerDetail) {
  return {
    ...customer,
    birthday: iso(customer.birthday),
    createdAt: customer.createdAt.toISOString(),
    deletedAt: iso(customer.deletedAt),
    appointments: customer.appointments.map(appointment => ({
      ...appointment,
      scheduledAt: appointment.scheduledAt.toISOString(),
      createdAt: appointment.createdAt.toISOString(),
      receipt: appointment.receipt
        ? {
            ...appointment.receipt,
            paidAt: appointment.receipt.paidAt.toISOString(),
          }
        : null,
    })),
    member: customer.member
      ? {
          ...customer.member,
          joinedAt: customer.member.joinedAt.toISOString(),
        }
      : null,
  }
}
