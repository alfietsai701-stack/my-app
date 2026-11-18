'use client'

import { useMemo, useState } from 'react'
import { serviceDescription } from '@/lib/booking-content'
import { ChevronRight, RotateCcw } from 'lucide-react'

type Service = { id: string; name: string; price: number; durationMin: number; category: string }
type ServiceMap = Record<string, Service[]>

type Option = { label: string; keywords: string[] }
type Question = { id: string; title: string; options: Option[] }

// 首次顧客測驗：用 3 題快速了解需求，再推薦合適方案。
const QUESTIONS: Question[] = [
  {
    id: 'goal',
    title: '這次最想改善的方向？',
    options: [
      { label: '臉部保養・膚況調理', keywords: ['臉', '面', '膚', '護膚', '保濕', '痘', '緊緻', '煥膚', '臉部', '清粉刺'] },
      { label: '舒壓放鬆・身體護理', keywords: ['身體', '按摩', '舒壓', '肩頸', '背', 'spa', 'SPA', '經絡', '淋巴'] },
      { label: '美甲・美睫・造型', keywords: ['美甲', '指甲', '光療', '美睫', '睫毛', '眼', '手部', '造型'] },
      { label: '還不確定，交給推薦', keywords: [] },
    ],
  },
  {
    id: 'skin',
    title: '你的膚況／偏好比較接近？',
    options: [
      { label: '敏感、想溫和舒緩', keywords: ['敏感', '溫和', '舒緩', '鎮定', '保濕'] },
      { label: '想抗老、緊緻拉提', keywords: ['抗老', '緊緻', '拉提', '煥膚', '電波', '精華'] },
      { label: '清潔、控油、清粉刺', keywords: ['清潔', '控油', '粉刺', '痘', '深層'] },
      { label: '一般保養即可', keywords: [] },
    ],
  },
  {
    id: 'budget',
    title: '這次預算大概落在？',
    options: [
      { label: '平價・輕鬆體驗', keywords: ['__budget_low'] },
      { label: '中價・穩定保養', keywords: ['__budget_mid'] },
      { label: '高階・完整療程', keywords: ['__budget_high'] },
      { label: '沒有特別限制', keywords: ['__budget_any'] },
    ],
  },
]

function budgetRange(kw: string[]): [number, number] {
  if (kw.includes('__budget_low')) return [0, 1500]
  if (kw.includes('__budget_mid')) return [1500, 3000]
  if (kw.includes('__budget_high')) return [3000, Infinity]
  return [0, Infinity]
}

function recommend(services: ServiceMap, answers: Option[]): { category: string; service: Service }[] {
  const all: { category: string; service: Service }[] = []
  for (const [category, list] of Object.entries(services)) {
    for (const service of list) all.push({ category, service })
  }
  if (all.length === 0) return []

  const [min, max] = budgetRange(answers[2]?.keywords ?? [])

  const scored = all.map(item => {
    const hay = `${item.service.name} ${item.category} ${serviceDescription(item.service.name) ?? ''}`.toLowerCase()
    let score = 0
    answers[0]?.keywords.forEach(k => { if (hay.includes(k.toLowerCase())) score += 2 })
    answers[1]?.keywords.forEach(k => { if (hay.includes(k.toLowerCase())) score += 1 })
    if (item.service.price >= min && item.service.price <= max) score += 1
    return { ...item, score }
  })

  const inBudget = scored.filter(s => s.service.price >= min && s.service.price <= max)
  const pool = inBudget.length > 0 ? inBudget : scored
  const withMatch = pool.filter(s => s.score > 0).sort((a, b) => b.score - a.score)

  const picks = (withMatch.length > 0 ? withMatch : [...pool].sort((a, b) => a.service.price - b.service.price))
  return picks.slice(0, 3)
}

export default function Quiz({ services, onPick }: {
  services: ServiceMap
  onPick: (category: string, serviceId: string) => void
}) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Option[]>([])

  const results = useMemo(
    () => (step >= QUESTIONS.length ? recommend(services, answers) : []),
    [step, answers, services],
  )

  function choose(opt: Option) {
    const next = [...answers.slice(0, step), opt]
    setAnswers(next)
    setStep(step + 1)
  }
  function restart() { setStep(0); setAnswers([]) }

  if (step >= QUESTIONS.length) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
        <p className="font-heading text-lg font-semibold text-ink">為你推薦的方案</p>

        {results.length === 0 ? (
          <p className="text-sm text-ink-muted">目前沒有可以推薦的方案，請直接回去挑選服務。</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {results.map(({ category, service }, i) => (
              <button key={service.id} onClick={() => onPick(category, service.id)}
                className={`flex w-full items-center justify-between gap-3 rounded-lg p-4 text-left transition-colors ${
                  i === 0 ? 'bg-sage-fresh' : 'border border-line hover:bg-surface-muted'
                }`}>
                <div className="flex min-w-0 flex-col gap-1">
                  {i === 0 && <span className="text-xs font-bold text-visit-green-ink">最推薦</span>}
                  <span className="font-heading text-base font-semibold text-ink">{service.name}</span>
                  {serviceDescription(service.name) && <span className="text-[13px] leading-relaxed text-ink-soft">{serviceDescription(service.name)}</span>}
                  <span className="text-xs text-ink-muted">{category}・{service.durationMin} 分鐘・NT$ {service.price.toLocaleString()}</span>
                </div>
                <span className="flex h-11 shrink-0 items-center gap-1 rounded-full bg-ink px-4 text-[13px] text-paper">預約<ChevronRight size={14} /></span>
              </button>
            ))}
          </div>
        )}

        <button onClick={restart} className="flex h-11 items-center gap-2 self-start text-[13px] text-ink underline underline-offset-4">
          <RotateCcw size={13} />重新測驗
        </button>
      </div>
    )
  }

  const q = QUESTIONS[step]
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-xs text-ink-muted">第 {step + 1} 題，共 {QUESTIONS.length} 題</p>
        <div className="h-1 w-full rounded-full bg-line-soft">
          <div className="h-1 rounded-full bg-ink transition-all duration-500" style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }} />
        </div>
      </div>

      <p className="font-heading text-lg font-semibold text-ink">{q.title}</p>
      <div className="flex flex-col gap-2.5">
        {q.options.map(opt => (
          <button key={opt.label} onClick={() => choose(opt)}
            className="flex min-h-[52px] w-full items-center justify-between gap-3 rounded-lg border border-line px-4 py-3 text-left transition-colors hover:border-ink hover:bg-surface-muted">
            <span className="text-sm text-ink">{opt.label}</span>
            <ChevronRight size={16} className="shrink-0 text-ink-muted" />
          </button>
        ))}
      </div>
    </div>
  )
}
