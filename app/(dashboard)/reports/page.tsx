'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from 'recharts'

type ReportData = {
  revenueThisMonth: number
  revenueLastMonth: number
  appointmentsThisMonth: number
  appointmentsLastMonth: number
  monthlyRevenue: { month: string; revenue: number; appointments: number }[]
  topServices: { name: string; count: number; revenue: number }[]
  payMethods: { method: string; total: number }[]
}

function pct(curr: number, prev: number) {
  if (prev === 0) return null
  return Math.round(((curr - prev) / prev) * 100)
}

function Trend({ curr, prev }: { curr: number; prev: number }) {
  const p = pct(curr, prev)
  if (p === null) return null
  if (p === 0) return <span className="flex items-center gap-1 text-[var(--t-text-4)]"><Minus size={10} />持平</span>
  return p > 0
    ? <span className="flex items-center gap-1 text-[#6B9E78]"><TrendingUp size={10} />較上月 +{p}%</span>
    : <span className="flex items-center gap-1 text-[#A06060]"><TrendingDown size={10} />較上月 {p}%</span>
}

const tooltipStyle = {
  contentStyle: { background: 'var(--t-surface)', border: '1px solid var(--t-border)', borderRadius: 0, fontSize: 11 },
  labelStyle: { color: 'var(--t-text-3)' },
  itemStyle: { color: 'var(--t-text)' },
  cursor: { fill: 'var(--t-bg)' },
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null)
  const [tab, setTab] = useState<'revenue' | 'appointments'>('revenue')

  useEffect(() => {
    fetch('/api/reports').then(r => r.ok ? r.json() : null).then(setData)
  }, [])

  const isEmpty = data && data.revenueThisMonth === 0 && data.appointmentsThisMonth === 0

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <header className="h-14 border-b border-[var(--t-border)] bg-[var(--t-surface)] flex items-center px-8 shrink-0">
        <p className="text-[10px] tracking-[0.35em] text-[var(--t-text-3)] uppercase">報表</p>
      </header>

      <main className="flex-1 bg-[var(--t-bg)] p-8 overflow-auto">
        {!data ? (
          <div className="flex items-center justify-center h-64 text-[10px] text-[var(--t-text-4)] tracking-widest">載入中</div>
        ) : isEmpty ? (
          <EmptyState />
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-5 mb-8">
              <KpiCard
                label="本月收入"
                value={`NT$ ${data.revenueThisMonth.toLocaleString()}`}
                sub={<Trend curr={data.revenueThisMonth} prev={data.revenueLastMonth} />}
                accent
              />
              <KpiCard
                label="本月預約"
                value={`${data.appointmentsThisMonth} 筆`}
                sub={<Trend curr={data.appointmentsThisMonth} prev={data.appointmentsLastMonth} />}
              />
            </div>

            {/* Chart tabs */}
            <div className="bg-[var(--t-surface)] border border-[var(--t-border)] mb-8">
              <div className="flex items-center border-b border-[var(--t-border)] px-7 gap-6">
                {([['revenue', '月收入'], ['appointments', '預約量']] as const).map(([key, label]) => (
                  <button key={key} onClick={() => setTab(key)}
                    className={`py-4 text-[10px] tracking-[0.25em] border-b-[1.5px] -mb-px transition-colors ${
                      tab === key ? 'border-[var(--t-accent)] text-[var(--t-accent)]' : 'border-transparent text-[var(--t-text-3)] hover:text-[var(--t-text-2)]'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="p-7">
                <ResponsiveContainer width="100%" height={220}>
                  {tab === 'revenue' ? (
                    <BarChart data={data.monthlyRevenue} barSize={20}>
                      <CartesianGrid vertical={false} stroke="var(--t-border)" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--t-text-3)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--t-text-3)' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} width={36} />
                      <Tooltip {...tooltipStyle} formatter={(v: number) => [`NT$ ${v.toLocaleString()}`, '收入']} />
                      <Bar dataKey="revenue" fill="var(--t-accent)" radius={0} />
                    </BarChart>
                  ) : (
                    <LineChart data={data.monthlyRevenue}>
                      <CartesianGrid vertical={false} stroke="var(--t-border)" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--t-text-3)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--t-text-3)' }} axisLine={false} tickLine={false} width={28} />
                      <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v} 筆`, '預約']} />
                      <Line dataKey="appointments" stroke="var(--t-accent)" strokeWidth={1.5} dot={{ fill: 'var(--t-accent)', r: 3 }} />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              {/* Top services */}
              {data.topServices.length > 0 && (
                <div className="bg-[var(--t-surface)] border border-[var(--t-border)]">
                  <div className="px-7 py-4 border-b border-[var(--t-border)]">
                    <p className="text-[10px] tracking-[0.3em] text-[var(--t-text-2)] uppercase">熱門服務</p>
                    <p className="text-[10px] text-[var(--t-text-4)] tracking-wide mt-0.5">近六個月</p>
                  </div>
                  <table className="w-full">
                    <tbody>
                      {data.topServices.map((s, i) => (
                        <tr key={i} className="border-b border-[var(--t-border)] last:border-0">
                          <td className="px-7 py-3">
                            <span className="text-[10px] text-[var(--t-text-4)] mr-3 tabular-nums">{i + 1}</span>
                            <span className="text-xs text-[var(--t-text)] font-light">{s.name}</span>
                          </td>
                          <td className="px-7 py-3 text-right text-xs text-[var(--t-text-3)] tabular-nums">{s.count} 次</td>
                          <td className="px-7 py-3 text-right text-xs text-[var(--t-text)] tabular-nums">NT$ {s.revenue.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pay methods */}
              {data.payMethods.length > 0 && (
                <div className="bg-[var(--t-surface)] border border-[var(--t-border)]">
                  <div className="px-7 py-4 border-b border-[var(--t-border)]">
                    <p className="text-[10px] tracking-[0.3em] text-[var(--t-text-2)] uppercase">付款方式</p>
                    <p className="text-[10px] text-[var(--t-text-4)] tracking-wide mt-0.5">本月</p>
                  </div>
                  {(() => {
                    const total = data.payMethods.reduce((s, p) => s + p.total, 0)
                    return (
                      <div className="px-7 py-5 space-y-4">
                        {data.payMethods.map((p, i) => (
                          <div key={i}>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs text-[var(--t-text-2)] font-light">{p.method}</span>
                              <span className="text-xs text-[var(--t-text)] tabular-nums">NT$ {p.total.toLocaleString()}</span>
                            </div>
                            <div className="h-px bg-[var(--t-border)]">
                              <div className="h-px bg-[var(--t-accent)] transition-all duration-500"
                                style={{ width: `${Math.round((p.total / total) * 100)}%` }} />
                            </div>
                            <p className="text-[10px] text-[var(--t-text-4)] mt-1">{Math.round((p.total / total) * 100)}%</p>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub: React.ReactNode; accent?: boolean }) {
  return (
    <div className="bg-[var(--t-surface)] border border-[var(--t-border)] p-7">
      <p className="text-[10px] text-[var(--t-text-3)] tracking-[0.25em] uppercase mb-5">{label}</p>
      <p className={`text-[2rem] font-extralight tracking-tight leading-none mb-2 ${accent ? 'text-[var(--t-accent)]' : 'text-[var(--t-text)]'}`}>{value}</p>
      <p className="text-[10px] tracking-wide">{sub}</p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <p className="text-xs text-[var(--t-text-3)] tracking-widest mb-2">尚無報表資料</p>
      <p className="text-[10px] text-[var(--t-text-4)] tracking-wide">完成第一筆預約結帳後，報表將自動生成</p>
    </div>
  )
}
