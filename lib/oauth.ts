// 第三方登入：Google、LINE、Facebook、Apple。
//
// 做法是「帳號綁定」：管理員先用帳號密碼登入，在「登入方式」綁定第三方帳號，
// 系統記下該平台的使用者 ID（sub），之後用第三方登入時就靠這個 ID 對應後台帳號。
// 不用 email 對應：Apple 可能給轉寄信箱、FB / LINE 常常拿不到 email，
// 而且沒驗證過的 email 會被冒用。
//
// 每個平台只要環境變數齊全就會自動啟用；缺任何一個，按鈕就不顯示、路由也會拒絕。

import crypto from 'crypto'
import { SignJWT, jwtVerify, createRemoteJWKSet, importPKCS8 } from 'jose'
import { PROVIDERS, type OAuthProvider } from './oauth-labels'

export { PROVIDERS, PROVIDER_LABEL, isOAuthProvider, type OAuthProvider } from './oauth-labels'

const env = (name: string) => process.env[name]?.trim() || undefined

const FB_VERSION = () => env('FACEBOOK_GRAPH_VERSION') ?? 'v26.0'

/** 各平台需要的環境變數 */
const REQUIRED_ENV: Record<OAuthProvider, string[]> = {
  google:   ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
  line:     ['LINE_LOGIN_CHANNEL_ID', 'LINE_LOGIN_CHANNEL_SECRET'],
  facebook: ['FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET'],
  apple:    ['APPLE_SERVICES_ID', 'APPLE_TEAM_ID', 'APPLE_KEY_ID', 'APPLE_PRIVATE_KEY'],
}

export function isProviderEnabled(p: OAuthProvider): boolean {
  return REQUIRED_ENV[p].every(name => !!env(name))
}

export function enabledProviders(): OAuthProvider[] {
  return PROVIDERS.filter(isProviderEnabled)
}

/**
 * 對外網址。有設 APP_URL 就固定用它（例如 https://ada-studio.com），
 * 避免同時用 *.vercel.app 和自訂網域時 redirect_uri 對不上。
 */
export function appOrigin(requestOrigin: string): string {
  return (env('APP_URL') ?? requestOrigin).replace(/\/+$/, '')
}

export function redirectUri(origin: string, p: OAuthProvider): string {
  return `${origin}/api/auth/oauth/${p}/callback`
}

/** 只接受站內路徑，防止被拿來導到外部網站 */
export function safeReturnPath(path: string | null | undefined): string {
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return '/'
  return path
}

// ── state cookie ────────────────────────────────────────────────────────────
// 把 state、nonce、模式（登入／綁定）一起簽成短效 JWT 放在 httpOnly cookie，
// callback 回來時比對，擋 CSRF 與重放。

export const STATE_COOKIE = 'oauth_state'
const STATE_TTL_SEC = 600
const stateSecret = () => new TextEncoder().encode(process.env.NEXTAUTH_SECRET)

export type OAuthState = {
  state: string
  nonce: string
  provider: OAuthProvider
  mode: 'login' | 'bind'
  userId?: string     // 綁定模式：發起綁定的後台帳號
  returnTo?: string   // 綁定完成後回到的頁面
}

export function randomToken(): string {
  return crypto.randomBytes(24).toString('base64url')
}

export async function signState(s: OAuthState): Promise<string> {
  return new SignJWT({ ...s })
    .setProtectedHeader({ alg: 'HS256' })
    .setAudience('oauth-state')
    .setExpirationTime(`${STATE_TTL_SEC}s`)
    .sign(stateSecret())
}

export async function readState(token: string | undefined): Promise<OAuthState | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, stateSecret(), { audience: 'oauth-state' })
    return payload as unknown as OAuthState
  } catch {
    return null
  }
}

export const stateCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: STATE_TTL_SEC,
  path: '/api/auth/oauth',
}

// ── 授權網址 ────────────────────────────────────────────────────────────────

export function buildAuthorizeUrl(
  p: OAuthProvider, opts: { origin: string; state: string; nonce: string },
): string {
  const common = {
    response_type: 'code',
    redirect_uri: redirectUri(opts.origin, p),
    state: opts.state,
  }
  let base: string
  let extra: Record<string, string>

  switch (p) {
    case 'google':
      base = 'https://accounts.google.com/o/oauth2/v2/auth'
      extra = { client_id: env('GOOGLE_CLIENT_ID')!, scope: 'openid email profile', nonce: opts.nonce, prompt: 'select_account' }
      break
    case 'line':
      // 只要 openid + profile：拿 sub 與顯示名稱就夠，不需要另外申請 email 權限
      base = 'https://access.line.me/oauth2/v2.1/authorize'
      extra = { client_id: env('LINE_LOGIN_CHANNEL_ID')!, scope: 'openid profile', nonce: opts.nonce }
      break
    case 'facebook':
      base = `https://www.facebook.com/${FB_VERSION()}/dialog/oauth`
      extra = { client_id: env('FACEBOOK_APP_ID')!, scope: 'public_profile' }
      break
    case 'apple':
      // 不要求 name / email scope，才能用 query 模式（GET 回來），
      // 否則 Apple 規定用 form_post，跨站 POST 會帶不到 cookie。
      base = 'https://appleid.apple.com/auth/authorize'
      extra = { client_id: env('APPLE_SERVICES_ID')!, response_mode: 'query', nonce: opts.nonce }
      break
  }

  const url = new URL(base)
  for (const [k, v] of Object.entries({ ...common, ...extra })) url.searchParams.set(k, v)
  return url.toString()
}

// ── 用 code 換身分 ──────────────────────────────────────────────────────────

export type ProviderIdentity = {
  providerUserId: string
  name?: string
  email?: string
}

export class OAuthError extends Error {}

const TIMEOUT_MS = 10_000

async function postForm(url: string, body: Record<string, string>): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new OAuthError(`${url} → ${res.status} ${JSON.stringify(data)}`)
  return data
}

async function getJson(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new OAuthError(`${new URL(url).pathname} → ${res.status} ${JSON.stringify(data)}`)
  return data
}

const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined)

const googleJwks = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'))
const appleJwks  = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'))

/** Apple 的 client_secret 是用 .p8 金鑰簽的 ES256 JWT */
async function appleClientSecret(): Promise<string> {
  const pem = env('APPLE_PRIVATE_KEY')!.replace(/\\n/g, '\n')
  const key = await importPKCS8(pem, 'ES256')
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: env('APPLE_KEY_ID')! })
    .setIssuer(env('APPLE_TEAM_ID')!)
    .setSubject(env('APPLE_SERVICES_ID')!)
    .setAudience('https://appleid.apple.com')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(key)
}

export async function fetchIdentity(
  p: OAuthProvider, code: string, origin: string, nonce: string,
): Promise<ProviderIdentity> {
  const redirect_uri = redirectUri(origin, p)

  if (p === 'google') {
    const clientId = env('GOOGLE_CLIENT_ID')!
    const token = await postForm('https://oauth2.googleapis.com/token', {
      grant_type: 'authorization_code', code, redirect_uri,
      client_id: clientId, client_secret: env('GOOGLE_CLIENT_SECRET')!,
    })
    const idToken = str(token.id_token)
    if (!idToken) throw new OAuthError('google: no id_token')
    const { payload } = await jwtVerify(idToken, googleJwks, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: clientId,
    })
    if (payload.nonce !== nonce) throw new OAuthError('google: nonce mismatch')
    const sub = str(payload.sub)
    if (!sub) throw new OAuthError('google: no sub')
    return {
      providerUserId: sub,
      name: str(payload.name),
      email: payload.email_verified === true ? str(payload.email) : undefined,
    }
  }

  if (p === 'line') {
    const clientId = env('LINE_LOGIN_CHANNEL_ID')!
    const token = await postForm('https://api.line.me/oauth2/v2.1/token', {
      grant_type: 'authorization_code', code, redirect_uri,
      client_id: clientId, client_secret: env('LINE_LOGIN_CHANNEL_SECRET')!,
    })
    const idToken = str(token.id_token)
    if (!idToken) throw new OAuthError('line: no id_token')
    // LINE 官方驗證端點：一併檢查簽章、aud、exp、nonce
    const claims = await postForm('https://api.line.me/oauth2/v2.1/verify', {
      id_token: idToken, client_id: clientId, nonce,
    })
    const sub = str(claims.sub)
    if (!sub) throw new OAuthError('line: no sub')
    return { providerUserId: sub, name: str(claims.name), email: str(claims.email) }
  }

  if (p === 'facebook') {
    const appId = env('FACEBOOK_APP_ID')!
    const appSecret = env('FACEBOOK_APP_SECRET')!
    const tokenUrl = new URL(`https://graph.facebook.com/${FB_VERSION()}/oauth/access_token`)
    tokenUrl.search = new URLSearchParams({ client_id: appId, client_secret: appSecret, redirect_uri, code }).toString()
    const token = await getJson(tokenUrl.toString())
    const accessToken = str(token.access_token)
    if (!accessToken) throw new OAuthError('facebook: no access_token')
    const proof = crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex')
    const meUrl = new URL(`https://graph.facebook.com/${FB_VERSION()}/me`)
    meUrl.search = new URLSearchParams({ fields: 'id,name', access_token: accessToken, appsecret_proof: proof }).toString()
    const me = await getJson(meUrl.toString())
    const id = str(me.id)
    if (!id) throw new OAuthError('facebook: no id')
    return { providerUserId: id, name: str(me.name) }
  }

  // apple
  const servicesId = env('APPLE_SERVICES_ID')!
  const token = await postForm('https://appleid.apple.com/auth/token', {
    grant_type: 'authorization_code', code, redirect_uri,
    client_id: servicesId, client_secret: await appleClientSecret(),
  })
  const idToken = str(token.id_token)
  if (!idToken) throw new OAuthError('apple: no id_token')
  const { payload } = await jwtVerify(idToken, appleJwks, {
    issuer: 'https://appleid.apple.com',
    audience: servicesId,
  })
  if (payload.nonce !== nonce) throw new OAuthError('apple: nonce mismatch')
  const sub = str(payload.sub)
  if (!sub) throw new OAuthError('apple: no sub')
  return { providerUserId: sub, email: str(payload.email) }
}
