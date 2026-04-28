'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
    if (res.ok) { router.push('/') } else {
      const data = await res.json()
      setError(data.error ?? '帳號或密碼錯誤')
    }
  }

  return (
    <div className="min-h-screen flex bg-[var(--t-bg)]">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-[var(--t-surface)] border-r border-[var(--t-border)] flex-col items-center justify-center p-16">
        <div className="max-w-xs text-center">
          <div className="w-px h-16 bg-[var(--t-border-s)] mx-auto mb-10" />
          <p className="text-[10px] tracking-[0.4em] text-[var(--t-accent)] uppercase mb-4">Ada Studio</p>
          <h1 className="text-3xl font-extralight text-[var(--t-text)] tracking-[0.15em] leading-relaxed mb-4">慢療室</h1>
          <p className="text-xs text-[var(--t-text-3)] tracking-widest leading-loose">
            以溫柔的節奏<br />守護每一位到來的人
          </p>
          <div className="w-px h-16 bg-[var(--t-border-s)] mx-auto mt-10" />
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden text-center mb-12">
            <p className="text-[10px] tracking-[0.4em] text-[var(--t-accent)] uppercase mb-2">Ada Studio</p>
            <h1 className="text-2xl font-extralight text-[var(--t-text)] tracking-[0.15em]">慢療室</h1>
          </div>

          <p className="text-[10px] tracking-[0.35em] text-[var(--t-text-3)] uppercase mb-8">管理後台</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-[10px] text-[var(--t-text-3)] tracking-[0.25em] uppercase mb-2 block">帳號</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="w-full bg-transparent border-b border-[var(--t-border-s)] focus:border-[var(--t-accent)] focus:outline-none py-2.5 text-sm text-[var(--t-text)] placeholder:text-[var(--t-text-4)] transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] text-[var(--t-text-3)] tracking-[0.25em] uppercase mb-2 block">密碼</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-transparent border-b border-[var(--t-border-s)] focus:border-[var(--t-accent)] focus:outline-none py-2.5 text-sm text-[var(--t-text)] placeholder:text-[var(--t-text-4)] transition-colors"
              />
            </div>
            {error && <p className="text-xs text-[#A05050]">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 border border-[var(--t-accent)] text-[var(--t-accent)] hover:bg-[var(--t-accent)] hover:text-[var(--t-accent-fg)] disabled:opacity-40 py-3 text-xs tracking-[0.25em] uppercase transition-all duration-200"
            >
              {loading ? '登入中' : '登入'}
            </button>
          </form>

          <p className="text-center text-[10px] text-[var(--t-text-4)] mt-12 tracking-[0.3em]">ADA STUDIO © 2026</p>
        </div>
      </div>
    </div>
  )
}
