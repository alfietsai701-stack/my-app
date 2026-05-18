import { getServices } from '@/lib/service-data'
import ServicesClient from './ServicesClient'

export default async function ServicesPage() {
  const services = await getServices()
  return <ServicesClient initialServices={services} />
}
