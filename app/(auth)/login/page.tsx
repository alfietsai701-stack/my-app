'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

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
    <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center p-6">
      <div className="bg-[#FDFCFA] border border-[#D6CFC4] rounded-2xl shadow-none w-full max-w-sm p-8">
        <div className="mb-8 text-center">
          <h1 className="text-base font-medium text-[#2C2420]">Ada 慢療室</h1>
          <p className="text-xs text-[#A89990] mt-0.5">管理後台</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[#2C2420] mb-1.5 block">
              帳號
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="請輸入帳號"
              className="w-full bg-[#EDE8E0] border border-[#D6CFC4] focus:border-[#C9A87C] focus:outline-none focus:ring-2 focus:ring-[#C9A87C]/20 rounded-xl px-4 py-2.5 text-sm text-[#2C2420] placeholder:text-[#A89990] transition-colors"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#2C2420] mb-1.5 block">
              密碼
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="請輸入密碼"
              className="w-full bg-[#EDE8E0] border border-[#D6CFC4] focus:border-[#C9A87C] focus:outline-none focus:ring-2 focus:ring-[#C9A87C]/20 rounded-xl px-4 py-2.5 text-sm text-[#2C2420] placeholder:text-[#A89990] transition-colors"
            />
          </div>

          {error && (
            <p className="text-xs text-[#B56B6B]">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#C9A87C] hover:bg-[#8B6347] text-white rounded-xl py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? '登入中...' : '登入'}
          </Button>
        </form>
      </div>
    </div>
  )
}
