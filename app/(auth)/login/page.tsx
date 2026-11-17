'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('error')
    if (!code) return
    const map: Record<string, string> = {
      no_account: '此第三方帳號尚未建立管理員權限，請聯絡系統管理員。',
      no_email: '無法取得第三方帳號的電子郵件，請改用帳號密碼登入。',
      invalid_state: '登入逾時或驗證失敗，請重新嘗試。',
      provider_disabled: '此第三方登入尚未啟用。',
    }
    setError(map[code] ?? '第三方登入失敗，請重新嘗試。')
  }, [])

  const googleEnabled = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_LOGIN === '1'
  const lineEnabled = process.env.NEXT_PUBLIC_ENABLE_LINE_LOGIN === '1'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    setLoading(false)
    if (res.ok) {
      window.location.href = '/'
    } else {
      const data = await res.json()
      setError(data.error ?? '帳號或密碼錯誤')
    }
  }

  const inputCls =
    'h-[50px] w-full rounded-lg border border-[#4A4A45] bg-[#2A2A27] px-4 text-base text-paper outline-none transition-colors placeholder:text-[#8F8F87] focus:border-sage-soft'

  return (
    <div className="flex min-h-dvh flex-col bg-ink text-paper lg:flex-row">
      {/* 左（手機：上）：Logo 放在紙色底上 */}
      <section className="flex items-center justify-center rounded-b-3xl bg-paper px-8 py-2 lg:flex-1 lg:flex-col lg:gap-2 lg:rounded-none lg:py-10">
        <Image src="/logo.png" alt="Ada 慢療室 Slow Healing Studio" width={360} height={360} priority
          className="size-[210px] lg:size-[min(360px,80%)] lg:h-auto" />
        <p className="hidden font-heading text-base tracking-[0.4em] text-ink-soft lg:block">慢慢來，比較快</p>
      </section>

      {/* 右（手機：下）：深色登入表單 */}
      <section className="flex flex-1 items-start justify-center px-6 py-6 lg:items-center lg:px-8 lg:py-12">
        <form onSubmit={handleSubmit} className="flex w-full max-w-[360px] flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-[26px] font-medium tracking-[0.08em] text-paper lg:text-3xl">歡迎回來</h1>
            <p className="hidden text-sm text-[#C4C4BC] lg:block">登入慢療室後台，看看今天的預約。</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-email" className="text-[13px] text-[#C4C4BC]">帳號</label>
            <input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
              required autoComplete="username" placeholder="your@email.com" className={inputCls} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-password" className="text-[13px] text-[#C4C4BC]">密碼</label>
            <div className="relative">
              <input id="login-password" type={showPw ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)} required autoComplete="current-password"
                placeholder="請輸入密碼" className={`${inputCls} pr-12`} />
              <button type="button" onClick={() => setShowPw(v => !v)}
                aria-label={showPw ? '隱藏密碼' : '顯示密碼'}
                className="absolute right-0.5 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center text-[#C4C4BC]">
                {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-visit-red-bg px-4 py-2.5 text-[13px] text-visit-red-ink">{error}</p>
          )}

          <button type="submit" disabled={loading}
            className="mt-1 flex h-[52px] items-center justify-center gap-2 rounded-full bg-paper text-base font-medium tracking-[0.25em] text-ink transition-colors hover:bg-white disabled:opacity-60">
            {loading && <span className="size-4 animate-spin rounded-full border-2 border-ink/20 border-t-ink" />}
            {loading ? '登入中' : '登入'}
          </button>

          <p className="text-center text-[13px] text-[#C4C4BC]">忘記密碼？請聯絡系統管理員協助重設。</p>

          {(googleEnabled || lineEnabled) && (
            <>
              <div className="flex items-center gap-3 text-xs text-[#C4C4BC]">
                <span className="h-px flex-1 bg-[#4A4A45]" />或使用<span className="h-px flex-1 bg-[#4A4A45]" />
              </div>
              <div className="flex gap-3">
                {lineEnabled && (
                  // eslint-disable-next-line @next/next/no-html-link-for-pages
                  <a href="/api/auth/oauth/line"
                    className="flex h-[50px] flex-1 items-center justify-center rounded-full border border-[#4A4A45] text-sm text-paper transition-colors hover:bg-[#2A2A27]">
                    LINE 登入
                  </a>
                )}
                {googleEnabled && (
                  // eslint-disable-next-line @next/next/no-html-link-for-pages
                  <a href="/api/auth/oauth/google"
                    className="flex h-[50px] flex-1 items-center justify-center rounded-full border border-[#4A4A45] text-sm text-paper transition-colors hover:bg-[#2A2A27]">
                    Google 登入
                  </a>
                )}
              </div>
            </>
          )}
        </form>
      </section>
    </div>
  )
}
