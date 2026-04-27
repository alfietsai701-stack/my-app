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

    if (res.ok) {
      router.push('/')
    } else {
      const data = await res.json()
      setError(data.error ?? '帳號或密碼錯誤')
    }
  }

  return (
    <div className="min-h-screen bg-[#0D0D0F] flex items-center justify-center p-6">
      {/* Subtle radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(201,169,110,0.06),transparent_70%)] pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Logo area */}
        <div className="text-center mb-10">
          <p className="text-[10px] tracking-[0.3em] text-[#C9A96E] uppercase mb-3">Ada Studio</p>
          <h1 className="text-2xl font-light text-[#F4F0E8] tracking-wide">慢療室</h1>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#2E2E33]" />
            <div className="w-1 h-1 rounded-full bg-[#C9A96E]" />
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#2E2E33]" />
          </div>
        </div>

        {/* Card */}
        <div className="bg-[#111113] border border-[#222226] rounded-2xl p-8">
          <p className="text-xs text-[#6A6460] tracking-widest uppercase mb-8">管理後台登入</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-xs text-[#A09890] tracking-wider uppercase mb-2 block">帳號</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="w-full bg-[#18181B] border border-[#2E2E33] focus:border-[#C9A96E] focus:outline-none rounded-xl px-4 py-3 text-sm text-[#F4F0E8] placeholder:text-[#3A3A40] transition-colors"
              />
            </div>

            <div>
              <label className="text-xs text-[#A09890] tracking-wider uppercase mb-2 block">密碼</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-[#18181B] border border-[#2E2E33] focus:border-[#C9A96E] focus:outline-none rounded-xl px-4 py-3 text-sm text-[#F4F0E8] placeholder:text-[#3A3A40] transition-colors"
              />
            </div>

            {error && <p className="text-xs text-[#B57070]">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-[#C9A96E] hover:bg-[#D4B87A] active:bg-[#B89058] disabled:opacity-50 text-[#0D0D0F] rounded-xl py-3 text-sm font-medium tracking-wide transition-colors"
            >
              {loading ? '登入中...' : '登入'}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-[#3A3A40] mt-6 tracking-wider">ADA STUDIO © 2026</p>
      </div>
    </div>
  )
}
