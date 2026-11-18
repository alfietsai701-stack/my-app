'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { ChevronLeft, Plus } from 'lucide-react'
import { DEFAULT_CUSTOMER_TAGS } from '@/lib/customer-tags'
import { VISIT_LIGHT_DAYS, VISIT_LIGHT_LABEL, visitLight, type VisitLightLevel } from '@/lib/visit-lights'
import {
  PageHeader, FilterChip, Tag, VisitLightTag, LightDot, SearchInput, Modal, FormField, EmptyState,
  btnPrimary, btnOutline, btnDanger, btnText, inputCls,
} from '@/components/ui/kit'

type Customer = {
  id: string; name: string; phone: string
  birthday: string | null; note: string | null; tags: string[]; createdAt: string
  _count: { appointments: number }
}
type Appointment = {
  id: string; scheduledAt: string; status: string
  service: { name: string; price: number }
  receipt: { total: number; payMethod: string } | null
}
type CustomerDetail = Customer & { appointments: Appointment[]; member: { tier: string; points: number } | null }

const EMPTY = { name: '', phone: '', birthday: '', note: '', tags: [] as string[] }

const statusLabel: Record<string, string> = { confirmed: '已確認', completed: '已完成', cancelled: '已取消' }
const TIER_LABEL: Record<string, string> = { general: '一般', silver: '銀卡', gold: '金卡' }
const LIGHT_LEVELS: VisitLightLevel[] = ['green', 'yellow', 'red']
const LIST_COLS = 'lg:grid-cols-[1.2fr_1.1fr_0.6fr_0.8fr_1.4fr]'

function fmtDay(iso: string) {
  const d = new Date(iso)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return sameYear ? `${d.getMonth() + 1}/${d.getDate()}` : `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

function age(birthday: string) {
  const diff = Date.now() - new Date(birthday).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}

export default function CustomersClient({ initialCustomers, lastVisits }: {
  initialCustomers: Customer[]
  /** 顧客 id → 最近一次來訪時間（ISO）。用來算回訪燈號。 */
  lastVisits: Record<string, string>
}) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers)
  const [q, setQ] = useState('')
  const [detail, setDetail] = useState<CustomerDetail | null>(null)
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [tagFilter, setTagFilter] = useState('')
  const [customTag, setCustomTag] = useState('')
  const [lightFilter, setLightFilter] = useState<VisitLightLevel | ''>('')

  // 回訪燈號：依最近來訪時間即時計算
  const lights = Object.fromEntries(customers.map(c => [c.id, visitLight(lastVisits[c.id])]))
  const lightCounts = { green: 0, yellow: 0, red: 0 }
  customers.forEach(c => { const l = lights[c.id]; if (l) lightCounts[l.level]++ })
  const visible = lightFilter ? customers.filter(c => lights[c.id]?.level === lightFilter) : customers

  const load = useCallback(async (search = q, tag = tagFilter) => {
    const res = await fetch(`/api/customers?q=${encodeURIComponent(search)}${tag ? `&tag=${encodeURIComponent(tag)}` : ''}`)
    if (res.ok) setCustomers(await res.json())
  }, [q, tagFilter])

  useEffect(() => {
    if (!q) return
    const t = setTimeout(() => load(q, tagFilter), 300)
    return () => clearTimeout(t)
  }, [q])

  // 標籤篩選：切換即重新查詢
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    load(q, tagFilter)
  }, [tagFilter])

  async function openDetail(id: string) {
    const res = await fetch(`/api/customers/${id}`)
    if (res.ok) setDetail(await res.json())
  }

  function openEdit(c: Customer) {
    setForm({ name: c.name, phone: c.phone, birthday: c.birthday ? c.birthday.slice(0, 10) : '', note: c.note ?? '', tags: c.tags ?? [] })
    setEditing(true)
  }

  async function handleSave() {
    setSaving(true)
    const body = { ...form, birthday: form.birthday || null }
    if (editing && detail) {
      const res = await fetch(`/api/customers/${detail.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) { setDetail({ ...detail, ...await res.json() }); setEditing(false) }
    } else {
      const res = await fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) { setAdding(false); setForm(EMPTY) }
    }
    setSaving(false); load()
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`確定要刪除顧客「${name}」？`)) return
    await fetch(`/api/customers/${id}`, { method: 'DELETE' })
    setDetail(null); load()
  }

  function toggleTag(t: string) {
    setForm(f => ({ ...f, tags: f.tags.includes(t) ? f.tags.filter(x => x !== t) : [...f.tags, t] }))
  }
  function addCustomTag() {
    const t = customTag.trim()
    if (!t) return
    setForm(f => (f.tags.includes(t) ? f : { ...f, tags: [...f.tags, t] }))
    setCustomTag('')
  }

  const detailLight = detail ? visitLight(lastVisits[detail.id]) : null
  const detailSpend = detail ? detail.appointments.reduce((sum, a) => sum + (a.receipt?.total ?? 0), 0) : 0
  const detailVisits = detail ? detail.appointments.filter(a => a.status !== 'cancelled').length : 0

  return (
    <div className="flex flex-1 flex-col overflow-hidden" style={{ background: 'var(--t-bg)' }}>
      <PageHeader title="顧客" meta={`共 ${customers.length} 位`}>
        <SearchInput value={q} onChange={setQ} placeholder="搜尋姓名或電話" className="hidden w-[260px] lg:flex" />
        <button onClick={() => { setForm(EMPTY); setAdding(true) }} className={btnPrimary}>
          <Plus size={16} strokeWidth={1.8} />新增顧客
        </button>
      </PageHeader>

      <div className={`shrink-0 flex-col gap-2.5 px-4 pt-2 lg:px-5 ${detail ? 'hidden lg:flex' : 'flex'}`}>
        <SearchInput value={q} onChange={setQ} placeholder="搜尋姓名或電話" className="lg:hidden" />
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
          <FilterChip active={!tagFilter && !lightFilter} onClick={() => { setTagFilter(''); setLightFilter('') }}>全部</FilterChip>
          {LIGHT_LEVELS.map(level => (
            <FilterChip key={level} active={lightFilter === level} onClick={() => setLightFilter(f => (f === level ? '' : level))}>
              <LightDot level={level} size={12} />
              {VISIT_LIGHT_LABEL[level]}　超過 {VISIT_LIGHT_DAYS[level]} 天　{lightCounts[level]}
            </FilterChip>
          ))}
          {DEFAULT_CUSTOMER_TAGS.map(t => (
            <FilterChip key={t} active={tagFilter === t} onClick={() => setTagFilter(f => (f === t ? '' : t))}>{t}</FilterChip>
          ))}
        </div>
        <p className="hidden text-xs text-ink-muted lg:block">
          回訪燈號：超過 {VISIT_LIGHT_DAYS.green} 天沒來亮綠燈、{VISIT_LIGHT_DAYS.yellow} 天黃燈、{VISIT_LIGHT_DAYS.red} 天紅燈。
        </p>
      </div>

      <div className="flex flex-1 gap-5 overflow-hidden px-4 pb-3 pt-3 lg:px-5 lg:pb-5">
        {/* ── 顧客清單 ── */}
        <section className={`min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-surface ${detail ? 'hidden lg:flex' : 'flex'}`}>
          {visible.length === 0 ? (
            <EmptyState title={customers.length === 0 ? '還沒有顧客資料' : '沒有符合條件的顧客'}
              hint={customers.length === 0 ? '按「新增顧客」建立第一位。' : '換個篩選條件試試。'} />
          ) : (
            <div className="flex-1 overflow-auto px-2 pb-2 pt-4">
              <div className={`hidden gap-2 px-3.5 pb-2 text-xs text-ink-muted lg:grid ${LIST_COLS}`}>
                <span>姓名</span><span>電話</span><span>來訪</span><span>最近來訪</span><span>回訪燈號</span>
              </div>
              {visible.map(c => {
                const light = lights[c.id]
                const last = lastVisits[c.id]
                const selected = detail?.id === c.id
                return (
                  <button key={c.id} onClick={() => openDetail(c.id)} aria-pressed={selected}
                    className={`grid min-h-[60px] w-full grid-cols-[1fr_auto] items-center gap-2 rounded-lg px-3.5 py-2 text-left text-sm text-ink transition-colors ${LIST_COLS} ${
                      selected ? 'bg-surface-muted font-medium' : 'hover:bg-surface-muted'
                    }`}>
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="truncate text-[15px] lg:text-sm">{c.name}</span>
                      <span className="text-xs font-normal text-ink-muted lg:hidden">
                        來訪 {c._count.appointments} 次{last ? `・最近 ${fmtDay(last)}` : ''}
                      </span>
                      {c.tags?.length > 0 && (
                        <span className="flex flex-wrap gap-1">
                          {c.tags.slice(0, 3).map(t => <Tag key={t} kind="sage">{t}</Tag>)}
                        </span>
                      )}
                    </span>
                    <span className="hidden font-normal text-ink-soft lg:block">{c.phone}</span>
                    <span className="hidden font-normal lg:block">{c._count.appointments} 次</span>
                    <span className="hidden font-normal text-ink-soft lg:block">{last ? fmtDay(last) : '—'}</span>
                    <span>{light ? <VisitLightTag light={light} /> : <span className="hidden text-xs text-ink-muted lg:inline">—</span>}</span>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {/* ── 顧客資料 ── */}
        {detail && (
          <section aria-label="顧客資料" className="flex w-full flex-col overflow-hidden rounded-2xl bg-surface lg:w-[400px] lg:shrink-0">
            <div className="flex-1 overflow-auto p-5 lg:p-[22px]">
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-2">
                  <button onClick={() => setDetail(null)} aria-label="回到顧客清單"
                    className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-surface-muted lg:hidden">
                    <ChevronLeft size={20} strokeWidth={1.6} />
                  </button>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <h2 className="truncate text-2xl tracking-[0.08em] text-ink">{detail.name}</h2>
                    <span className="text-[13px] text-ink-soft">{detail.phone}</span>
                  </div>
                  <span className="hidden lg:block">
                    <button onClick={() => setDetail(null)} className={btnText}>關閉</button>
                  </span>
                </div>

                {detailLight && (
                  <p className={`flex items-center gap-2 rounded-xl px-3.5 py-3 text-sm font-bold ${
                    detailLight.level === 'red' ? 'bg-visit-red-bg text-visit-red-ink'
                      : detailLight.level === 'yellow' ? 'bg-visit-yellow-bg text-visit-yellow-ink'
                      : 'bg-visit-green-bg text-visit-green-ink'
                  }`}>
                    <LightDot level={detailLight.level} size={12} />
                    {VISIT_LIGHT_LABEL[detailLight.level]}・已經 {detailLight.days} 天沒來
                  </p>
                )}

                <div className="flex gap-3 border-b border-line-soft border-t-ink py-3.5 [border-top-width:1px]">
                  <Stat label="來訪" value={`${detailVisits} 次`} />
                  <Stat label="累計消費" value={detailSpend > 0 ? detailSpend.toLocaleString() : '—'} />
                  <Stat label="最近來訪" value={lastVisits[detail.id] ? fmtDay(lastVisits[detail.id]) : '—'} />
                </div>

                <dl className="grid grid-cols-2 gap-x-3 gap-y-3 text-sm">
                  {[
                    ['生日', detail.birthday ? `${detail.birthday.slice(0, 10)}（${age(detail.birthday)} 歲）` : '—'],
                    ['加入日期', new Date(detail.createdAt).toLocaleDateString('zh-TW')],
                    ['會員等級', detail.member ? TIER_LABEL[detail.member.tier] ?? detail.member.tier : '非會員'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex flex-col gap-0.5">
                      <dt className="text-xs text-ink-muted">{label}</dt>
                      <dd className="text-ink">{value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="flex flex-col gap-2">
                  <span className="text-[13px] font-bold text-ink">標籤與備註</span>
                  {detail.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">{detail.tags.map(t => <Tag key={t} kind="sage">{t}</Tag>)}</div>
                  )}
                  <p className="rounded-lg bg-surface-muted px-3.5 py-2.5 text-[13px] leading-relaxed text-ink">
                    {detail.note || '尚無備註。可以記下膚質、過敏或偏好。'}
                  </p>
                </div>

                <div className="flex flex-col">
                  <div className="flex items-baseline justify-between pb-1">
                    <span className="text-[13px] font-bold text-ink">預約紀錄</span>
                    <span className="text-xs text-ink-muted">{detail.appointments.length} 筆</span>
                  </div>
                  {detail.appointments.length === 0 ? (
                    <p className="py-3 text-[13px] text-ink-muted">還沒有預約紀錄。</p>
                  ) : detail.appointments.map(a => (
                    <div key={a.id} className="flex items-center justify-between gap-2 border-b border-line-soft py-2.5 text-[13px] last:border-0">
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className={`truncate text-ink ${a.status === 'cancelled' ? 'text-ink-faint line-through' : ''}`}>{a.service.name}</span>
                        <span className="text-xs text-ink-muted">{fmtDay(a.scheduledAt)}・{statusLabel[a.status] ?? a.status}</span>
                      </span>
                      <span className="num shrink-0 text-base text-ink">{a.receipt ? a.receipt.total.toLocaleString() : '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 gap-2 border-t border-line-soft p-4">
              <button onClick={() => openEdit(detail)} className={`${btnOutline} flex-1`}>編輯資料</button>
              <button onClick={() => handleDelete(detail.id, detail.name)} className={btnDanger}>刪除</button>
            </div>
          </section>
        )}
      </div>

      {/* ── 新增／編輯 ── */}
      {(adding || editing) && (
        <Modal title={editing ? '編輯顧客' : '新增顧客'} onClose={() => { setAdding(false); setEditing(false) }}
          footer={
            <button onClick={handleSave} disabled={saving} className={`${btnPrimary} h-[50px] flex-1`}>
              {saving ? '儲存中' : editing ? '儲存變更' : '建立顧客'}
            </button>
          }>
          {([
            { label: '姓名', key: 'name' as const, placeholder: '王小明', type: 'text' },
            { label: '電話', key: 'phone' as const, placeholder: '0912345678', type: 'tel' },
            { label: '生日（選填）', key: 'birthday' as const, placeholder: '', type: 'date' },
            { label: '備註（選填）', key: 'note' as const, placeholder: '膚質、過敏、偏好', type: 'text' },
          ]).map(({ label, key, placeholder, type }) => (
            <FormField key={key} label={label} htmlFor={`cust-${key}`}>
              <input id={`cust-${key}`} type={type} placeholder={placeholder} value={form[key]}
                onChange={e => setForm({ ...form, [key]: e.target.value })} className={inputCls} />
            </FormField>
          ))}
          <FormField label="標籤">
            <div className="flex flex-wrap gap-2">
              {[...new Set<string>([...DEFAULT_CUSTOMER_TAGS, ...form.tags])].map(t => {
                const on = form.tags.includes(t)
                return (
                  <button key={t} type="button" onClick={() => toggleTag(t)} aria-pressed={on}
                    className={`h-11 rounded-full px-4 text-[13px] transition-colors ${
                      on ? 'bg-ink text-paper' : 'border border-border-input text-ink hover:bg-surface-muted'
                    }`}>
                    {t}
                  </button>
                )
              })}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <input value={customTag} onChange={e => setCustomTag(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag() } }}
                aria-label="自訂標籤" placeholder="自訂標籤" className={`${inputCls} flex-1`} />
              <button type="button" onClick={addCustomTag} disabled={!customTag.trim()} className={btnOutline}>加入</button>
            </div>
          </FormField>
        </Modal>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex flex-1 flex-col gap-0.5">
      <span className="text-xs text-ink-muted">{label}</span>
      <span className="num text-[22px] font-semibold leading-tight text-ink">{value}</span>
    </span>
  )
}
