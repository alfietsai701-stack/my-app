// 第三方登入（OIDC）設定：Google 與 LINE Login。
// 兩者皆回傳 OIDC id_token，內含 email / name，登入後以 email 對應 AdminUser。
export type OAuthProvider = 'google' | 'line'

type ProviderMeta = {
  authorizeUrl: string
  tokenUrl: string
  scope: string
  clientId?: string
  clientSecret?: string
}

export function providerConfig(p: OAuthProvider): ProviderMeta | null {
  if (p === 'google') {
    return {
      authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scope: 'openid email profile',
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }
  }
  if (p === 'line') {
    return {
      authorizeUrl: 'https://access.line.me/oauth2/v2.1/authorize',
      tokenUrl: 'https://api.line.me/oauth2/v2.1/token',
      scope: 'openid email profile',
      clientId: process.env.LINE_LOGIN_CHANNEL_ID,
      clientSecret: process.env.LINE_LOGIN_CHANNEL_SECRET,
    }
  }
  return null
}

export function isProviderEnabled(p: OAuthProvider): boolean {
  const c = providerConfig(p)
  return !!(c?.clientId && c?.clientSecret)
}

export function redirectUri(origin: string, p: OAuthProvider): string {
  return `${origin}/api/auth/oauth/${p}/callback`
}

/** 解碼 OIDC id_token 取得 email / name（不驗簽；code 交換是機密通道，回傳可信）。 */
export function decodeIdToken(idToken: string): { email?: string; name?: string } {
  try {
    const payload = idToken.split('.')[1]
    const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return { email: json.email, name: json.name ?? json.given_name }
  } catch {
    return {}
  }
}

export async function exchangeCode(
  p: OAuthProvider, code: string, origin: string,
): Promise<{ email?: string; name?: string } | null> {
  const cfg = providerConfig(p)
  if (!cfg?.clientId || !cfg?.clientSecret) return null

  const res = await fetch(cfg.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri(origin, p),
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
    }),
  })
  if (!res.ok) return null
  const data = await res.json()
  if (!data.id_token) return null
  return decodeIdToken(data.id_token)
}
