'use client'

import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { Sparkles, ChevronRight, RotateCcw } from 'lucide-react'

type Service = { id: string; name: string; price: number; durationMin: number; category: string }
type ServiceMap = Record<string, Service[]>

const C = {
  surface: '#FFFDFC', border: '#E4D3BE', borderStrong: '#DCC7AA',
  accent: '#B99868', accentBg: 'rgba(185,152,104,0.14)', dark: '#33281E',
  text: '#33281E', text3: '#76685B', text4: '#9A8A7B', bg: '#F8F1E6',
}

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
    const hay = `${item.service.name} ${item.category}`.toLowerCase()
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

  const card: CSSProperties = { background: C.surface, border: `1px solid ${C.border}` }

  if (step >= QUESTIONS.length) {
    return (
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-6 flex items-center gap-2">
          <Sparkles size={16} style={{ color: C.accent }} />
          <p className="text-sm font-medium" style={{ color: C.dark }}>為你推薦的方案</p>
        </div>

        {results.length === 0 ? (
          <p className="text-sm" style={{ color: C.text3 }}>目前尚無可推薦的方案，請直接前往預約。</p>
        ) : (
          <div className="space-y-3">
            {results.map(({ category, service }, i) => (
              <button key={service.id} onClick={() => onPick(category, service.id)}
                className="flex w-full items-center justify-between p-4 text-left transition-all hover:shadow-sm"
                style={{ ...card, borderColor: i === 0 ? C.accent : C.border }}>
                <div>
                  {i === 0 && <span className="mb-1 inline-block text-[10px] tracking-[0.2em]" style={{ color: C.accent }}>最推薦</span>}
                  <p className="text-sm font-medium" style={{ color: C.dark }}>{service.name}</p>
                  <p className="mt-0.5 text-xs" style={{ color: C.text4 }}>{category}・{service.durationMin} 分鐘・NT$ {service.price.toLocaleString()}</p>
                </div>
                <span className="flex items-center gap-1 text-xs" style={{ color: C.accent }}>預約<ChevronRight size={14} /></span>
              </button>
            ))}
          </div>
        )}

        <button onClick={restart} className="mt-6 flex items-center gap-2 text-xs" style={{ color: C.text4 }}>
          <RotateCcw size={12} />重新測驗
        </button>
      </div>
    )
  }

  const q = QUESTIONS[step]
  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="mb-6">
        <p className="mb-2 text-[11px] tracking-[0.2em]" style={{ color: C.accent }}>測驗 {step + 1} / {QUESTIONS.length}</p>
        <div className="h-1 w-full" style={{ background: C.accentBg }}>
          <div className="h-1 transition-all" style={{ width: `${((step) / QUESTIONS.length) * 100}%`, background: C.accent }} />
        </div>
      </div>

      <p className="mb-5 text-lg font-medium" style={{ color: C.dark }}>{q.title}</p>
      <div className="space-y-3">
        {q.options.map(opt => (
          <button key={opt.label} onClick={() => choose(opt)}
            className="flex w-full items-center justify-between p-4 text-left transition-all hover:shadow-sm"
            style={card}
            onMouseEnter={e => (e.currentTarget.style.borderColor = C.accent)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}>
            <span className="text-sm" style={{ color: C.text }}>{opt.label}</span>
            <ChevronRight size={15} style={{ color: C.text4 }} />
          </button>
        ))}
      </div>
    </div>
  )
}
