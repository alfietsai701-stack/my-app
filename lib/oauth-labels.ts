// 第三方登入的平台清單與顯示名稱。前後端共用，不能 import 伺服器端套件。

export const PROVIDERS = ['google', 'line', 'facebook', 'apple'] as const
export type OAuthProvider = (typeof PROVIDERS)[number]

export const PROVIDER_LABEL: Record<OAuthProvider, string> = {
  google: 'Google',
  line: 'LINE',
  facebook: 'Facebook',
  apple: 'Apple',
}

export function isOAuthProvider(p: string): p is OAuthProvider {
  return (PROVIDERS as readonly string[]).includes(p)
}
