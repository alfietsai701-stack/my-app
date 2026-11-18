'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import { PageHeader, EmptyState, btnSecondary } from '@/components/ui/kit'

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
// 圖表配色只用設計系統的墨黑與鼠尾草綠
const INK = '#1C1C1A'
const SAGE_MID = '#6F8572'
const SAGE_SOFT = '#C9D2C6'
const CAT_COLORS = [INK, SAGE_MID, SAGE_SOFT, '#A9B5A6']
const tooltipStyle = {
  contentStyle: { background: '#FFFFFF', border: '1px solid #E3E3DC', borderRadius: 14, fontSize: 12, padding: '8px 12px' },
  labelStyle: { color: '#5C5C56', marginBottom: 2 },
  itemStyle: { color: INK },
  cursor: { fill: '#F4F4EF' },
}

function change(curr: number, prev: number, unit = '') {
  if (prev === 0) return '上月沒有資料'
  const p = Math.round(((curr - prev) / prev) * 100)
  if (p === 0) return '與上月持平'
  return `較上月 ${p > 0 ? '+' : ''}${p}%${unit}`
}

function exportCsv(data: Report) {
  const rows = [
    ['月份', data.month],
    ['營收', String(data.revenue)],
    ['預約數', String(data.apptCount)],
    ['完成數', String(data.completedCount)],
    ['平均客單價', String(data.avgTicket)],
    [],
    ['服務', '分類', '次數', '營收'],
    ...data.services.map(s => [s.name, s.category, String(s.count), String(s.revenue)]),
  ]
  const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\r\n')
  // 加 BOM，Excel 開啟中文才不會亂碼
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `慢療室報表-${data.month}.csv`
  a.click()
  URL.revokeObjectURL(url)
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
  const maxCount = data ? Math.max(1, ...data.services.map(s => s.count)) : 1
  const navBtn = 'flex size-11 items-center justify-center rounded-full bg-surface text-ink transition-colors hover:bg-surface-muted disabled:opacity-35'

  return (
    <div className="flex flex-1 flex-col overflow-hidden" style={{ background: 'var(--t-bg)' }}>
      <PageHeader title="報表" meta={`${year} 年 ${month} 月`}>
        <div className="flex items-center gap-1.5">
          <button onClick={() => shiftMonth(-1)} aria-label="上個月" className={navBtn}><ChevronLeft size={18} strokeWidth={1.6} /></button>
          {!isCurrentMonth && (
            <button onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth() + 1) }} className={btnSecondary}>本月</button>
          )}
          <button onClick={() => shiftMonth(1)} disabled={isCurrentMonth} aria-label="下個月" className={navBtn}><ChevronRight size={18} strokeWidth={1.6} /></button>
        </div>
        <button onClick={() => data && exportCsv(data)} disabled={!data} className={btnSecondary}>
          <Download size={16} strokeWidth={1.6} />匯出
        </button>
      </PageHeader>

      <main className="flex-1 overflow-auto px-4 pb-4 pt-3 lg:px-5 lg:pb-5">
        {loading || !data ? (
          <ReportSkeleton />
        ) : (
          <div className="flex flex-col gap-4">
            {/* 重點數字 */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
              {[
                { label: '營收', value: data.revenue > 0 ? `NT$ ${data.revenue.toLocaleString()}` : '—', sub: change(data.revenue, data.prevRevenue) },
                { label: '預約數', value: `${data.apptCount}`, sub: change(data.apptCount, data.prevAppts) },
                { label: '完成數', value: `${data.completedCount}`, sub: data.apptCount > 0 ? `完成率 ${Math.round(data.completedCount / data.apptCount * 100)}%` : '—' },
                { label: '平均客單價', value: data.avgTicket > 0 ? `NT$ ${data.avgTicket.toLocaleString()}` : '—', sub: data.completedCount > 0 ? `共 ${data.completedCount} 筆結帳` : '還沒有結帳' },
              ].map(({ label, value, sub }) => (
                <div key={label} className="flex flex-col gap-1.5 rounded-2xl bg-surface px-4 py-3.5 lg:px-5 lg:py-4">
                  <span className="text-[13px] text-ink-muted">{label}</span>
                  <span className="num text-[26px] font-semibold leading-none text-ink lg:text-[34px]">{value}</span>
                  <span className="text-xs text-ink-muted">{sub}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
              {/* 營收趨勢 */}
              <section className="flex min-w-0 flex-col gap-4 rounded-2xl bg-surface p-5 lg:flex-[1.5] lg:px-[26px] lg:py-[22px]">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-[19px] text-ink">營收趨勢</h2>
                  <span className="text-xs text-ink-muted">近 12 個月（元）</span>
                </div>
                <div className="h-[220px] lg:h-full lg:min-h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.trendData} barSize={18}>
                      <CartesianGrid vertical={false} stroke="#ECECE6" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#5C5C56' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#5C5C56' }} axisLine={false} tickLine={false}
                        tickFormatter={v => v === 0 ? '0' : `${(v / 1000).toFixed(0)}k`} width={34} />
                      <Tooltip {...tooltipStyle} formatter={(v) => [`NT$ ${Number(v).toLocaleString()}`, '營收']} />
                      <Bar dataKey="revenue" radius={[8, 8, 0, 0]}>
                        {data.trendData.map(entry => (
                          <Cell key={entry.fullMonth} fill={entry.fullMonth === toMonthStr(year, month) ? INK : SAGE_SOFT} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* 分類占比 */}
              <section className="flex min-w-0 flex-col gap-3 rounded-2xl bg-surface p-5 lg:flex-1 lg:p-[22px]">
                <h2 className="text-[19px] text-ink">分類占比</h2>
                {data.categories.length === 0 ? (
                  <p className="text-[13px] text-ink-muted">這個月還沒有結帳資料。</p>
                ) : (<>
                  <div role="img" aria-label={data.categories.map(c => `${c.name} ${c.pct}%`).join('、')}
                    className="flex h-3.5 overflow-hidden rounded-full">
                    {data.categories.map((c, i) => (
                      <span key={c.name} style={{ width: `${c.pct}%`, background: CAT_COLORS[i % CAT_COLORS.length] }} />
                    ))}
                  </div>
                  <div className="flex flex-col">
                    {data.categories.map((c, i) => (
                      <div key={c.name} className="flex items-center justify-between gap-2 border-b border-line-soft py-2.5 text-[13px] last:border-0">
                        <span className="flex items-center gap-2 text-ink">
                          <span aria-hidden="true" className="size-3 rounded-full" style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} />
                          {c.name}
                        </span>
                        <span className="flex items-baseline gap-3 text-ink-soft">
                          <span className="text-xs text-ink-muted">{c.count} 筆</span>
                          <span className="num text-base text-ink">{c.revenue.toLocaleString()}</span>
                          <span className="w-9 text-right font-bold text-ink">{c.pct}%</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </>)}
              </section>
            </div>

            {/* 熱門服務排行 */}
            <section className="flex flex-col gap-3 rounded-2xl bg-surface p-5 lg:p-[22px]">
              <div className="flex items-baseline justify-between">
                <h2 className="text-[19px] text-ink">熱門服務排行</h2>
                <span className="text-xs text-ink-muted">依次數</span>
              </div>
              {data.services.length === 0 ? (
                <EmptyState title="這個月還沒有結帳資料" hint="完成結帳後會自動出現分析。" />
              ) : (
                <div className="grid grid-cols-1 gap-x-8 gap-y-3 lg:grid-cols-2">
                  {[...data.services].sort((a, b) => b.count - a.count).map((s, i) => (
                    <div key={`${s.name}-${i}`} className="flex flex-col gap-1.5 text-[13px]">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="min-w-0 truncate text-ink">
                          <span className="num mr-2 text-base text-ink-muted">{i + 1}</span>{s.name}
                          <span className="ml-2 text-xs text-ink-muted">{s.category}</span>
                        </span>
                        <span className="shrink-0 text-ink-soft">{s.count} 次・<span className="num text-base text-ink">{s.revenue.toLocaleString()}</span></span>
                      </span>
                      <span className="flex h-2 rounded-full bg-line-soft">
                        <span className="rounded-full" style={{ width: `${(s.count / maxCount) * 100}%`, background: i === 0 ? INK : SAGE_MID }} />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

function ReportSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-2xl bg-surface px-5 py-4">
            <div className="h-3 w-16 rounded-full bg-line-soft" />
            <div className="h-7 w-28 rounded-full bg-line-soft" />
            <div className="h-3 w-20 rounded-full bg-line-soft" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl bg-surface p-6">
        <div className="mb-8 h-3 w-24 rounded-full bg-line-soft" />
        <div className="flex h-48 items-end gap-3">
          {[44, 66, 52, 78, 48, 86, 58, 72, 42, 64, 76, 60].map((height, i) => (
            <div key={i} className="flex-1 rounded-t-lg bg-line-soft" style={{ height: `${height}%` }} />
          ))}
        </div>
      </div>
    </div>
  )
}
