'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'

type SvcRow   = { name: string; category: string; count: number; revenue: number }
type CatRow   = { name: string; count: number; revenue: number; pct: number }
type TrendRow = { month: string; fullMonth: string; revenue: number; count: number }

type Report = {
  month: string
  revenue: number; prevRevenue: number
  apptCount: number; prevAppts: number; completedCount: number; avgTicket: number
  services: SvcRow[]; categories: CatRow[]; trendData: TrendRow[]
}

const toMonthStr = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`
const tooltipStyle = {
  contentStyle: { background: 'var(--t-surface)', border: '1px solid var(--t-border)', borderRadius: 0, fontSize: 11, padding: '6px 12px' },
  labelStyle: { color: 'var(--t-text-3)', marginBottom: 2 },
  itemStyle: { color: 'var(--t-text)' },
  cursor: { fill: 'var(--t-bg)' },
}

function Trend({ curr, prev, unit = '' }: { curr: number; prev: number; unit?: string }) {
  if (prev === 0) return <span className="text-[var(--t-text-4)]">尚無前月資料</span>
  const p = Math.round(((curr - prev) / prev) * 100)
  if (p === 0) return <span className="flex items-center gap-1 text-[var(--t-text-4)]"><Minus size={9} />與上月持平</span>
  return p > 0
    ? <span className="flex items-center gap-1 text-[#6B9E78]"><TrendingUp size={9} />較上月 +{p}%{unit}</span>
    : <span className="flex items-center gap-1 text-[#A06060]"><TrendingDown size={9} />較上月 {p}%{unit}</span>
}

export default function ReportsPage() {
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [data, setData]   = useState<Report | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    fetch(`/api/reports?month=${toMonthStr(year, month)}`, { signal: controller.signal })
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d))
      .catch(err => {
        if (err.name !== 'AbortError') setData(null)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [year, month])

  function shiftMonth(dir: 1 | -1) {
    let m = month + dir, y = year
    if (m > 12) { m = 1; y += 1 }
    if (m < 1)  { m = 12; y -= 1 }
    setMonth(m); setYear(y)
  }

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <header className="h-14 border-b border-[var(--t-border)] bg-[var(--t-surface)] flex items-center justify-between px-4 lg:px-8 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => shiftMonth(-1)} className="text-[var(--t-text-4)] hover:text-[var(--t-text-2)] transition-colors"><ChevronLeft size={15} strokeWidth={1.5} /></button>
          <p className="text-[10px] tracking-[0.3em] text-[var(--t-text-3)] uppercase min-w-[80px] text-center">{year} 年 {month} 月</p>
          <button onClick={() => shiftMonth(1)} disabled={isCurrentMonth} className="text-[var(--t-text-4)] hover:text-[var(--t-text-2)] transition-colors disabled:opacity-30"><ChevronRight size={15} strokeWidth={1.5} /></button>
        </div>
        {!isCurrentMonth && (
          <button onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth() + 1) }}
            className="text-[10px] text-[var(--t-text-4)] hover:text-[var(--t-accent)] tracking-[0.2em] uppercase transition-colors">本月</button>
        )}
      </header>

      <main className="flex-1 bg-[var(--t-bg)] p-4 lg:p-8 overflow-auto">
        {loading || !data ? (
          <ReportSkeleton />
        ) : (
          <div className="space-y-6 lg:space-y-8">

            {/* KPI row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
              {[
                { label: '總收入', value: data.revenue > 0 ? `NT$ ${data.revenue.toLocaleString()}` : '—', sub: <Trend curr={data.revenue} prev={data.prevRevenue} />, accent: true },
                { label: '預約數', value: `${data.apptCount} 筆`, sub: <Trend curr={data.apptCount} prev={data.prevAppts} /> },
                { label: '完成數', value: `${data.completedCount} 筆`, sub: data.apptCount > 0 ? `完成率 ${Math.round(data.completedCount / data.apptCount * 100)}%` : '—' },
                { label: '平均客單價', value: data.avgTicket > 0 ? `NT$ ${data.avgTicket.toLocaleString()}` : '—', sub: data.completedCount > 0 ? `共 ${data.completedCount} 筆結帳` : '尚無結帳' },
              ].map(({ label, value, sub, accent }) => (
                <div key={label} className="bg-[var(--t-surface)] border border-[var(--t-border)] p-5 lg:p-6">
                  <p className="text-[10px] text-[var(--t-text-3)] tracking-[0.25em] uppercase mb-4">{label}</p>
                  <p className={`text-[1.35rem] lg:text-[1.6rem] font-extralight tracking-tight leading-none mb-2 ${accent ? 'text-[var(--t-accent)]' : 'text-[var(--t-text)]'}`}>{value}</p>
                  <p className="text-[10px] text-[var(--t-text-4)] tracking-wide">{sub}</p>
                </div>
              ))}
            </div>

            {/* Revenue trend */}
            <div className="bg-[var(--t-surface)] border border-[var(--t-border)]">
              <div className="px-6 py-4 border-b border-[var(--t-border)] flex items-center justify-between">
                <p className="text-[10px] tracking-[0.3em] text-[var(--t-text-2)] uppercase">收入趨勢</p>
                <p className="text-[10px] text-[var(--t-text-4)] tracking-wide">近 12 個月</p>
              </div>
              <div className="p-4 lg:p-6">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.trendData} barSize={16}>
                    <CartesianGrid vertical={false} stroke="var(--t-border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--t-text-4)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--t-text-4)' }} axisLine={false} tickLine={false}
                      tickFormatter={v => v === 0 ? '0' : `${(v/1000).toFixed(0)}k`} width={32} />
                    <Tooltip {...tooltipStyle} formatter={(v) => [`NT$ ${Number(v).toLocaleString()}`, '收入']} />
                    <Bar dataKey="revenue" radius={0}>
                      {data.trendData.map((entry) => (
                        <Cell key={entry.fullMonth}
                          fill={entry.fullMonth === toMonthStr(year, month) ? 'var(--t-accent)' : 'var(--t-border-s)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {data.services.length === 0 ? (
              <div className="bg-[var(--t-surface)] border border-[var(--t-border)] px-8 py-12 text-center">
                <p className="text-xs text-[var(--t-text-3)] tracking-widest mb-1">本月尚無收入資料</p>
                <p className="text-[10px] text-[var(--t-text-4)] tracking-wide">完成結帳後將自動顯示分析</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
                {/* Service breakdown */}
                <div className="bg-[var(--t-surface)] border border-[var(--t-border)]">
                  <div className="px-6 py-4 border-b border-[var(--t-border)]">
                    <p className="text-[10px] tracking-[0.3em] text-[var(--t-text-2)] uppercase">服務項目分析</p>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--t-border)]">
                        {['服務', '次數', '收入', '佔比'].map((h, i) => (
                          <th key={h} className={`text-[10px] font-normal text-[var(--t-text-4)] tracking-[0.2em] uppercase py-3 ${i === 0 ? 'text-left px-6' : 'text-right px-6'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.services.map((s, i) => {
                        const pct = data.revenue > 0 ? Math.round((s.revenue / data.revenue) * 100) : 0
                        return (
                          <tr key={i} className="border-b border-[var(--t-border)] last:border-0">
                            <td className="px-6 py-3">
                              <p className="text-xs font-light text-[var(--t-text)]">{s.name}</p>
                              <p className="text-[10px] text-[var(--t-text-4)] mt-0.5">{s.category}</p>
                            </td>
                            <td className="px-6 py-3 text-right text-xs text-[var(--t-text-3)] tabular-nums">{s.count}</td>
                            <td className="px-6 py-3 text-right text-xs text-[var(--t-text)] tabular-nums">NT$ {s.revenue.toLocaleString()}</td>
                            <td className="px-6 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-12 h-px bg-[var(--t-border)] relative">
                                  <div className="absolute left-0 top-0 h-px bg-[var(--t-accent)]" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-[10px] text-[var(--t-text-4)] tabular-nums w-8 text-right">{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Category breakdown */}
                <div className="bg-[var(--t-surface)] border border-[var(--t-border)]">
                  <div className="px-6 py-4 border-b border-[var(--t-border)]">
                    <p className="text-[10px] tracking-[0.3em] text-[var(--t-text-2)] uppercase">類別佔比</p>
                  </div>
                  <div className="p-4">
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={data.categories} layout="vertical" barSize={14} margin={{ left: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--t-text-3)' }} axisLine={false} tickLine={false} width={72} />
                        <Tooltip {...tooltipStyle} formatter={(v) => [`NT$ ${Number(v).toLocaleString()}`, '收入']} />
                        <Bar dataKey="revenue" fill="var(--t-accent)" radius={0} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="px-6 pb-5 space-y-3">
                    {data.categories.map((c, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-xs text-[var(--t-text-2)] font-light">{c.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-[var(--t-text-4)] tabular-nums">{c.count} 筆</span>
                          <span className="text-xs text-[var(--t-text)] tabular-nums">NT$ {c.revenue.toLocaleString()}</span>
                          <span className="text-[10px] text-[var(--t-accent)] tabular-nums w-8 text-right">{c.pct}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function ReportSkeleton() {
  return (
    <div className="space-y-6 lg:space-y-8 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-[var(--t-surface)] border border-[var(--t-border)] p-5 lg:p-6">
            <div className="h-2 w-20 bg-[var(--t-elevated)] mb-5" />
            <div className="h-7 w-28 bg-[var(--t-elevated)] mb-3" />
            <div className="h-2 w-24 bg-[var(--t-elevated)]" />
          </div>
        ))}
      </div>
      <div className="bg-[var(--t-surface)] border border-[var(--t-border)] p-6">
        <div className="h-2 w-24 bg-[var(--t-elevated)] mb-8" />
        <div className="flex h-48 items-end gap-3">
          {[44, 66, 52, 78, 48, 86, 58, 72, 42, 64, 76, 60].map((height, i) => (
            <div key={i} className="flex-1 bg-[var(--t-elevated)]" style={{ height: `${height}%` }} />
          ))}
        </div>
      </div>
    </div>
  )
}
