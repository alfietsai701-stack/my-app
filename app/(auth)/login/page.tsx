'use client'

import { useState } from 'react'
import { Eye, EyeOff, LogIn, Sparkles } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
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
      window.location.href = '/'
    } else {
      const data = await res.json()
      setError(data.error ?? '帳號或密碼錯誤')
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#F8F1E6' }}>
      <main className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-5 py-8 lg:grid-cols-[1fr_420px] lg:px-10">
        <section className="hidden lg:block">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center text-white" style={{ background: '#B99868' }}>
              <Sparkles size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#33281E' }}>美業管理後台</p>
              <p className="text-xs" style={{ color: '#9A8A7B' }}>Salon Operations</p>
            </div>
          </div>

          <div className="max-w-md">
            <p className="mb-4 text-[11px] font-semibold tracking-[0.28em]" style={{ color: '#9B744A' }}>
              LUXE SALON SYSTEM
            </p>
            <h1 className="text-4xl font-semibold leading-tight tracking-normal" style={{ color: '#33281E' }}>
              安靜、清楚、適合日常管理的後台。
            </h1>
            <p className="mt-5 text-sm leading-7" style={{ color: '#76685B' }}>
              集中處理預約、顧客、服務與營運數據。介面保留必要資訊密度，視覺更像精品沙龍內部工具。
            </p>
          </div>

          <div className="mt-12 grid max-w-md grid-cols-2 gap-px border" style={{ borderColor: '#E4D3BE', background: '#E4D3BE' }}>
            {[
              ['預約管理', 'Calendar'],
              ['顧客資料', 'Clients'],
              ['服務項目', 'Services'],
              ['營運報表', 'Reports'],
            ].map(([label, sub]) => (
              <div key={label} className="bg-[#FFFDFC] p-5">
                <p className="text-sm font-semibold" style={{ color: '#33281E' }}>{label}</p>
                <p className="mt-1 text-xs" style={{ color: '#9A8A7B' }}>{sub}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center">
          <div className="w-full max-w-sm">
            <div className="mb-8 lg:hidden">
              <div className="mb-5 flex size-11 items-center justify-center text-white" style={{ background: '#B99868' }}>
                <Sparkles size={18} />
              </div>
              <h1 className="text-2xl font-semibold tracking-normal" style={{ color: '#33281E' }}>美業管理後台</h1>
              <p className="mt-1 text-sm" style={{ color: '#9A8A7B' }}>請登入您的管理帳號</p>
            </div>

            <div className="border p-7 sm:p-8" style={{ background: '#FFFDFC', borderColor: '#E4D3BE' }}>
              <div className="mb-8">
                <p className="text-[11px] font-semibold tracking-[0.26em]" style={{ color: '#9B744A' }}>SIGN IN</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-normal" style={{ color: '#33281E' }}>歡迎回來</h2>
                <p className="mt-1 text-sm" style={{ color: '#9A8A7B' }}>使用管理員帳號繼續</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="mb-2 block text-xs font-semibold" style={{ color: '#5E4C3D' }}>
                    電子信箱
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="your@email.com"
                    className="w-full px-0 py-3 text-sm outline-none transition-all"
                    style={{
                      background: 'transparent',
                      borderBottom: '1.5px solid #DCC7AA',
                      color: '#33281E',
                    }}
                    onFocus={e => {
                      e.currentTarget.style.borderColor = '#B99868'
                    }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = '#DCC7AA'
                    }}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold" style={{ color: '#5E4C3D' }}>
                    密碼
                  </label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full px-0 py-3 pr-10 text-sm outline-none transition-all"
                      style={{
                        background: 'transparent',
                        borderBottom: '1.5px solid #DCC7AA',
                        color: '#33281E',
                      }}
                      onFocus={e => {
                        e.currentTarget.style.borderColor = '#B99868'
                      }}
                      onBlur={e => {
                        e.currentTarget.style.borderColor = '#DCC7AA'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 p-1"
                      style={{ color: '#9A8A7B' }}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 px-3 py-2.5 text-xs font-medium"
                    style={{ background: 'rgba(184,92,80,0.10)', color: '#B85C50' }}>
                    <span className="size-1.5 shrink-0 rounded-full bg-current" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-3 flex w-full items-center justify-center gap-2 py-3 text-sm font-semibold transition-all disabled:opacity-60"
                  style={{ background: '#33281E', color: '#FFFFFF' }}>
                  {loading ? (
                    <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <LogIn size={15} strokeWidth={2} />
                  )}
                  {loading ? '登入中…' : '登入'}
                </button>
              </form>
            </div>

            <p className="mt-5 text-center text-[11px]" style={{ color: '#9A8A7B' }}>
              美業管理系統 © 2026 · 僅供授權人員使用
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
