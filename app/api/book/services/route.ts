import { NextResponse } from 'next/server'
import { getGroupedBookServices } from '@/lib/service-data'

export async function GET() {
  const grouped = await getGroupedBookServices()

  return NextResponse.json(grouped, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  })
}
