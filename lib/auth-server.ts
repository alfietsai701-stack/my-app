import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { Permissions } from './permissions'

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET)

export type TokenPayload = {
  id: string
  email: string
  name: string
  permissions: Permissions
}

export async function getSession(): Promise<TokenPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as unknown as TokenPayload
  } catch {
    return null
  }
}
