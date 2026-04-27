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
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--t-bg)]">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 30%, var(--t-glow), transparent 70%)' }} />

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-10">
          <p className="text-[10px] tracking-[0.3em] text-[var(--t-gold)] uppercase mb-3">Ada Studio</p>
          <h1 className="text-2xl font-light text-[var(--t-text)] tracking-wide">慢療室</h1>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, transparent, var(--t-border-s))` }} />
            <div className="w-1 h-1 rounded-full bg-[var(--t-gold)]" />
            <div className="flex-1 h-px" style={{ background: `linear-gradient(to left, transparent, var(--t-border-s))` }} />
          </div>
        </div>

        <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl p-8">
          <p className="text-xs text-[var(--t-text-3)] tracking-widest uppercase mb-8">管理後台登入</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-[10px] text-[var(--t-text-2)] tracking-widest uppercase mb-2 block">帳號</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="w-full bg-[var(--t-elevated)] border border-[var(--t-border-s)] focus:border-[var(--t-gold)] focus:outline-none rounded-xl px-4 py-3 text-sm text-[var(--t-text)] placeholder:text-[var(--t-text-4)] transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] text-[var(--t-text-2)] tracking-widest uppercase mb-2 block">密碼</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-[var(--t-elevated)] border border-[var(--t-border-s)] focus:border-[var(--t-gold)] focus:outline-none rounded-xl px-4 py-3 text-sm text-[var(--t-text)] placeholder:text-[var(--t-text-4)] transition-colors"
              />
            </div>
            {error && <p className="text-xs text-[#B57070]">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 rounded-xl py-3 text-sm font-medium tracking-wide transition-colors disabled:opacity-50 bg-[var(--t-gold)] hover:bg-[var(--t-gold-h)] text-[var(--t-gold-fg)]"
            >
              {loading ? '登入中...' : '登入'}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-[var(--t-text-4)] mt-6 tracking-wider">ADA STUDIO © 2026</p>
      </div>
    </div>
  )
}
