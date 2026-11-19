import { connection } from 'next/server'
import { enabledProviders } from '@/lib/oauth'
import LoginForm from './LoginForm'

// 伺服器端判斷哪些第三方登入已設定好金鑰，只顯示能用的按鈕
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string | string[] }> }) {
  await connection() // 每次請求時讀環境變數，不在 build 時寫死
  const { error } = await searchParams
  return <LoginForm providers={enabledProviders()} errorCode={typeof error === 'string' ? error : undefined} />
}
