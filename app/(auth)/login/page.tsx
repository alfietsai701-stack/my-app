'use client'

import { useState } from 'react'
import { Eye, EyeOff, LogIn } from 'lucide-react'

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
    <div className="min-h-screen flex" style={{ background: '#F8F1E6' }}>

      {/* ── Left: Brand panel (desktop only) ── */}
      <div className="hidden lg:flex w-5/12 flex-col items-center justify-center relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #3B2D22 0%, #7E6047 62%, #B99868 100%)' }}>

        <div className="absolute inset-x-10 top-10 h-px" style={{ background: 'rgba(255,255,255,0.18)' }} />
        <div className="absolute inset-x-10 bottom-10 h-px" style={{ background: 'rgba(255,255,255,0.14)' }} />

        <div className="relative z-10 text-center text-white px-12 max-w-sm">
          {/* Logo */}
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-8"
            style={{ background: 'rgba(255,255,255,0.13)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.22)' }}>
            ✦
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-3">美業管理後台</h1>
          <p className="text-base font-light opacity-75 leading-relaxed">
            預約・顧客・庫存・報表<br />一站式門市管理解決方案
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-10">
            {['預約管理', '顧客資料', '庫存追蹤', '業績報表'].map(t => (
              <span key={t} className="text-xs px-3 py-1.5 rounded-full font-medium"
                style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: Login form ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl text-white mx-auto mb-4"
              style={{ background: 'linear-gradient(135deg, #B99868, #7E6047)' }}>
              ✦
            </div>
            <h1 className="text-xl font-bold" style={{ color: '#33281E' }}>美業管理後台</h1>
            <p className="text-sm mt-1" style={{ color: '#9A8A7B' }}>後台管理系統</p>
          </div>

          {/* Card */}
          <div className="rounded-2xl p-8" style={{ background: '#FFFDFC', boxShadow: '0 4px 24px rgba(51,40,30,0.12)' }}>
            <div className="hidden lg:block mb-8">
              <h2 className="text-xl font-bold" style={{ color: '#33281E' }}>歡迎回來</h2>
              <p className="text-sm mt-1" style={{ color: '#9A8A7B' }}>請登入您的管理帳號</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: '#5E4C3D' }}>
                  電子信箱
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: '#FAF4EA',
                    border: '1.5px solid #E4D3BE',
                    color: '#33281E',
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = '#B99868'
                    e.currentTarget.style.background = '#FFFDFC'
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = '#E4D3BE'
                    e.currentTarget.style.background = '#FAF4EA'
                  }}
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: '#5E4C3D' }}>
                  密碼
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full px-4 py-3 pr-12 rounded-xl text-sm outline-none transition-all"
                    style={{
                      background: '#FAF4EA',
                      border: '1.5px solid #E4D3BE',
                      color: '#33281E',
                    }}
                    onFocus={e => {
                      e.currentTarget.style.borderColor = '#B99868'
                      e.currentTarget.style.background = '#FFFDFC'
                    }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = '#E4D3BE'
                      e.currentTarget.style.background = '#FAF4EA'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1"
                    style={{ color: '#9A8A7B' }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium"
                  style={{ background: 'rgba(184,92,80,0.10)', color: '#B85C50' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60 mt-2"
                style={{ background: 'linear-gradient(135deg, #B99868, #7E6047)', color: '#FFFFFF' }}>
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <LogIn size={15} strokeWidth={2} />
                )}
                {loading ? '登入中…' : '登入'}
              </button>
            </form>
          </div>

          <p className="text-center text-[11px] mt-6" style={{ color: '#9A8A7B' }}>
            美業管理系統 © 2026 · 僅供授權人員使用
          </p>
        </div>
      </div>
    </div>
  )
}
