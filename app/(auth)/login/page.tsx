'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, LogIn } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
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
      router.push('/')
    } else {
      const data = await res.json()
      setError(data.error ?? '帳號或密碼錯誤')
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#EFF3FA' }}>

      {/* ── Left: Blue brand panel (desktop only) ── */}
      <div className="hidden lg:flex w-5/12 flex-col items-center justify-center relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #1255CC 0%, #0A42A8 60%, #082E80 100%)' }}>

        {/* Decorative circles */}
        <div className="absolute top-[-80px] right-[-80px] w-[320px] h-[320px] rounded-full opacity-10"
          style={{ background: 'rgba(255,255,255,0.5)' }} />
        <div className="absolute bottom-[-60px] left-[-60px] w-[240px] h-[240px] rounded-full opacity-10"
          style={{ background: 'rgba(255,255,255,0.5)' }} />
        <div className="absolute top-1/2 left-[-40px] w-[160px] h-[160px] rounded-full opacity-5"
          style={{ background: 'rgba(255,255,255,0.8)' }} />

        <div className="relative z-10 text-center text-white px-12 max-w-sm">
          {/* Logo */}
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-8"
            style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}>
            A
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-3">Ada 慢療室</h1>
          <p className="text-base font-light opacity-75 leading-relaxed">
            以溫柔的節奏<br />守護每一位到來的人
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
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white mx-auto mb-4"
              style={{ background: 'linear-gradient(135deg, #1255CC, #0A42A8)' }}>
              A
            </div>
            <h1 className="text-xl font-bold" style={{ color: '#0F1E38' }}>Ada 慢療室</h1>
            <p className="text-sm mt-1" style={{ color: '#9AADC8' }}>管理後台</p>
          </div>

          {/* Card */}
          <div className="rounded-2xl p-8" style={{ background: '#FFFFFF', boxShadow: '0 4px 24px rgba(15,30,56,0.10)' }}>
            <div className="hidden lg:block mb-8">
              <h2 className="text-xl font-bold" style={{ color: '#0F1E38' }}>歡迎回來</h2>
              <p className="text-sm mt-1" style={{ color: '#9AADC8' }}>請登入您的管理帳號</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: '#334A6E' }}>
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
                    background: '#EFF3FA',
                    border: '1.5px solid #E2E8F4',
                    color: '#0F1E38',
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = '#1255CC'
                    e.currentTarget.style.background = '#FFF'
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = '#E2E8F4'
                    e.currentTarget.style.background = '#EFF3FA'
                  }}
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: '#334A6E' }}>
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
                      background: '#EFF3FA',
                      border: '1.5px solid #E2E8F4',
                      color: '#0F1E38',
                    }}
                    onFocus={e => {
                      e.currentTarget.style.borderColor = '#1255CC'
                      e.currentTarget.style.background = '#FFF'
                    }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = '#E2E8F4'
                      e.currentTarget.style.background = '#EFF3FA'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1"
                    style={{ color: '#9AADC8' }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium"
                  style={{ background: 'rgba(220,38,38,0.07)', color: '#DC2626' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60 mt-2"
                style={{ background: 'linear-gradient(135deg, #1255CC, #0A42A8)', color: '#FFFFFF' }}>
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <LogIn size={15} strokeWidth={2} />
                )}
                {loading ? '登入中…' : '登入'}
              </button>
            </form>
          </div>

          <p className="text-center text-[11px] mt-6" style={{ color: '#9AADC8' }}>
            Ada Studio © 2026 · 僅供授權人員使用
          </p>
        </div>
      </div>
    </div>
  )
}
