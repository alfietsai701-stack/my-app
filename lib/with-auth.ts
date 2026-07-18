import { NextRequest, NextResponse } from 'next/server'
import { getSession } from './auth-server'
import type { TokenPayload } from './auth-server'
import type { Permissions } from './permissions'

type RouteHandler<T = unknown> = (
  req: NextRequest,
  ctx: T,
  session: TokenPayload,
) => Promise<NextResponse> | NextResponse

/**
 * Wraps a route handler with authentication.
 * Returns 401 if no valid session cookie is present.
 *
 * Usage:
 *   export const GET = withAuth(async (req, ctx, session) => { ... })
 */
export function withAuth<T = unknown>(handler: RouteHandler<T>) {
  return async (req: NextRequest, ctx: T): Promise<NextResponse> => {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }
    return handler(req, ctx, session)
  }
}

/**
 * Wraps a route handler with authentication + permission check.
 * Returns 401 if not logged in, 403 if missing the required permission.
 *
 * Usage:
 *   export const GET = withPermission('reports', async (req, ctx, session) => { ... })
 */
export function withPermission<T = unknown>(
  permission: keyof Permissions,
  handler: RouteHandler<T>,
) {
  return async (req: NextRequest, ctx: T): Promise<NextResponse> => {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }
    if (!session.permissions[permission]) {
      return NextResponse.json({ error: '無權限' }, { status: 403 })
    }
    return handler(req, ctx, session)
  }
}
