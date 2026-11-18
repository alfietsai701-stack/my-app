'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Image from 'next/image'
import Quiz from './Quiz'
import { serviceDescription, BOOKING_NOTICE } from '@/lib/booking-content'
import { Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

type Service = { id: string; name: string; price: number; durationMin: number; category: string }
type ServiceMap = Record<string, Service[]>

type FormData = {
  category: string
  serviceId: string
  date: string
  time: string
  name: string
  phone: string
  email: string
  note: string
}

const EMPTY: FormData = { category: '', serviceId: '', date: '', time: '', name: '', phone: '', email: '', note: '' }

function toInputDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function tomorrow(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return toInputDate(d)
}

function maxDate(): string {
  const now = new Date()
  return toInputDate(new Date(now.getFullYear(), now.getMonth() + 2, 0))
}

type BusinessHours = { closedWeekdays: number[]; closedDates: string[]; openDates: string[] }
const DEFAULT_HOURS: BusinessHours = { closedWeekdays: [0], closedDates: [], openDates: [] }
const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

// 與伺服器端 lib/business-hours.ts 的 isClosedOn 邏輯一致
function isClosed(dateStr: string, hours: BusinessHours): boolean {
  if (hours.openDates.includes(dateStr)) return false
  if (hours.closedDates.includes(dateStr)) return true
  const [y, m, d] = dateStr.split('-').map(Number)
  return hours.closedWeekdays.includes(new Date(y, m - 1, d).getDay())
}

function closedLabel(hours: BusinessHours): string {
  if (hours.closedWeekdays.length === 0) return '每日營業'
  return '週' + hours.closedWeekdays.slice().sort().map(d => WEEKDAY_LABELS[d]).join('、') + '公休'
}

function formatDate(d: string): string {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  const wd = ['日', '一', '二', '三', '四', '五', '六'][new Date(Number(y), Number(m) - 1, Number(day)).getDay()]
  return `${y}年${m}月${day}日（週${wd}）`
}

/** 11 月 18 日　週三 */
function longDate(d: string): string {
  if (!d) return ''
  const [y, m, day] = d.split('-').map(Number)
  const wd = WEEKDAY_LABELS[new Date(y, m - 1, day).getDay()]
  return `${m} 月 ${day} 日　週${wd}`
}

/** 11/18（三） */
function shortDate(d: string): string {
  if (!d) return ''
  const [y, m, day] = d.split('-').map(Number)
  const wd = WEEKDAY_LABELS[new Date(y, m - 1, day).getDay()]
  return `${m}/${day}（${wd}）`
}

/** 14:00 + 60 分 → 15:00 */
function addMinutes(time: string, minutes: number): string {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function compactDate(d: string): { day: string; weekday: string; month: string } {
  const [y, m, day] = d.split('-').map(Number)
  const date = new Date(y, m - 1, day)
  return {
    day: String(day),
    weekday: ['週日', '週一', '週二', '週三', '週四', '週五', '週六'][date.getDay()],
    month: `${m}月`,
  }
}

function quickDates(hours: BusinessHours): string[] {
  const result: string[] = []
  const date = new Date()
  date.setDate(date.getDate() + 1)

  while (result.length < 7) {
    const value = toInputDate(date)
    if (!isClosed(value, hours)) result.push(value)
    date.setDate(date.getDate() + 1)
  }

  return result
}

export default function BookForm({ businessName }: { businessName: string }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormData>(EMPTY)
  const [services, setServices] = useState<ServiceMap>({})
  const [slots, setSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<{ code: string; service: string; date: string; time: string } | null>(null)
  const [error, setError] = useState('')
  // LIFF 的 ID token：後端會向 LINE 驗證，取代直接傳 userId（可被偽造）
  const [lineIdToken, setLineIdToken] = useState('')
  const [hours, setHours] = useState<BusinessHours>(DEFAULT_HOURS)
  const [returning, setReturning] = useState(false)
  const [mode, setMode] = useState<'booking' | 'quiz'>('booking')
  const [agreed, setAgreed] = useState(false)
  const slotCacheRef = useRef(new Map<string, string[]>())
  const slotRequestRef = useRef(0)

  useEffect(() => {
    fetch('/api/book/services').then(r => r.json()).then((data: ServiceMap) => {
      setServices(data)
    }).catch(() => {})

    // 公休日設定：改由後台設定驅動，不再寫死週日
    fetch('/api/book/config').then(r => r.json()).then((h: BusinessHours) => {
      if (h && Array.isArray(h.closedWeekdays)) setHours(h)
    }).catch(() => {})

    const liffId = process.env.NEXT_PUBLIC_LIFF_ID
    if (!liffId) return
    ;(async () => {
      try {
        const liff = (await import('@line/liff')).default
        await liff.init({ liffId })
        if (!liff.isLoggedIn()) return
        const profile = await liff.getProfile()
        setForm(prev => ({ ...prev, name: prev.name || profile.displayName || '' }))

        // 需在 LIFF 設定勾選 openid scope 才拿得到 ID token
        const idToken = liff.getIDToken()
        if (!idToken) return
        setLineIdToken(idToken)

        // 老客自動帶入上次的基本資料，省去重複輸入
        try {
          const r = await fetch('/api/book/customer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
          })
          const c = await r.json()
          if (c?.returning) {
            setReturning(true)
            setForm(prev => ({
              ...prev,
              name:  c.name || prev.name,
              phone: prev.phone || c.phone || '',
              email: prev.email || c.email || '',
            }))
          }
        } catch {}
      } catch {
        // Booking remains available outside LIFF.
      }
    })()
  }, [])

  const loadSlots = useCallback(async (date: string, serviceId: string) => {
    if (!date || !serviceId || isClosed(date, hours)) {
      setSlots([])
      setSlotsLoading(false)
      return
    }
    const svc = Object.values(services).flat().find(s => s.id === serviceId)
    if (!svc) return
    const cacheKey = `${date}:${svc.durationMin}`
    const cachedSlots = slotCacheRef.current.get(cacheKey)
    if (cachedSlots) {
      setSlots(cachedSlots)
      setSlotsLoading(false)
      return
    }

    const requestId = slotRequestRef.current + 1
    slotRequestRef.current = requestId
    setSlots([])
    setSlotsLoading(true)
    try {
      const r = await fetch(`/api/book/slots?date=${date}&duration=${svc.durationMin}`)
      const data = await r.json()
      if (slotRequestRef.current !== requestId) return
      slotCacheRef.current.set(cacheKey, data)
      setSlots(data)
    } catch {
      if (slotRequestRef.current === requestId) setSlots([])
    } finally {
      if (slotRequestRef.current === requestId) setSlotsLoading(false)
    }
  }, [services, hours])

  const flatServices = useMemo(() => Object.values(services).flat(), [services])
  const selectedService = flatServices.find(s => s.id === form.serviceId)
  const categories = Object.keys(services)
  // category 為空字串代表「全部」
  const visibleServices = form.category ? services[form.category] ?? [] : flatServices
  const dates = useMemo(() => quickDates(hours), [hours])
  const step0Valid = !!form.serviceId
  const step1Valid = !!form.date && !!form.time && !isClosed(form.date, hours)
  const step2Valid = form.name.trim().length >= 2 && /^09\d{8}$/.test(form.phone.replace(/[-\s]/g, ''))

  function setField<K extends keyof FormData>(k: K, v: FormData[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  function selectCategory(cat: string) {
    setForm(prev => ({ ...prev, category: cat, serviceId: '', time: '' }))
    setSlots([])
  }

  // 選好服務就直接進「選時段」，並預選最近的營業日，少點一次
  function selectService(id: string) {
    const date = form.date || dates[0] || ''
    setForm(prev => ({ ...prev, serviceId: id, date, time: '' }))
    if (date) loadSlots(date, id)
    setStep(1)
  }

  // 選好時段後：LINE 已帶入姓名電話就略過填資料，直接到確認
  function afterSlot() {
    setStep(step2Valid ? 3 : 2)
  }

  function selectDate(d: string) {
    setField('date', d)
    setField('time', '')
    if (d && form.serviceId) loadSlots(d, form.serviceId)
  }

  function handleQuizPick(category: string, serviceId: string) {
    const date = form.date || dates[0] || ''
    setForm(prev => ({ ...prev, category, serviceId, date, time: '' }))
    setSlots([])
    if (date) loadSlots(date, serviceId)
    setMode('booking')
    setStep(1)
  }

  async function submit() {
    if (!step2Valid || !step0Valid || !step1Valid || !agreed) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, idToken: lineIdToken }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? '預約失敗，請再試一次')
        return
      }
      setDone(data)
    } catch {
      setError('網路錯誤，請再試一次')
    } finally {
      setSubmitting(false)
    }
  }

  // ── 畫面 ──────────────────────────────────────────────────────────────────

  if (done) {
    return (
      <Shell>
        <div className="bk-success-card flex flex-1 flex-col items-center justify-center gap-6 py-10 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-ink text-paper">
            <Check size={30} strokeWidth={1.6} />
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="text-[26px] font-medium text-ink">預約成功</h1>
            <p className="text-sm text-ink-muted">我們已收到你的預約，到時候見。</p>
          </div>
          <div className="flex w-full flex-col gap-4 rounded-2xl bg-ink px-[22px] py-6 text-left text-paper">
            <div className="flex flex-col gap-1">
              <span className="text-[13px] text-sage-soft">{longDate(done.date)}</span>
              <span className="num text-[56px] font-medium leading-none">{done.time}</span>
            </div>
            <div className="h-px bg-[#4A4A45]" />
            <div className="flex items-end justify-between gap-3">
              <span className="font-heading text-[19px] font-semibold tracking-wider">{done.service}</span>
              <span className="text-[13px] text-sage-soft">預約編號　<span className="num text-lg text-paper">{done.code}</span></span>
            </div>
          </div>
          {form.email && <p className="text-[13px] text-ink-muted">確認信已寄到 {form.email}</p>}
        </div>
      </Shell>
    )
  }

  if (mode === 'quiz') {
    return (
      <Shell>
        <BackHeader title="幫你推薦" onBack={() => setMode('booking')} />
        <div className="bk-step-content rounded-2xl bg-surface p-5">
          <Quiz services={services} onPick={handleQuizPick} />
        </div>
      </Shell>
    )
  }

  const greetingName = form.name.trim()
  const slotGroups: [string, string[]][] = ([
    ['上午', slots.filter(t => t < '12:00')],
    ['下午', slots.filter(t => t >= '12:00' && t < '17:00')],
    ['傍晚', slots.filter(t => t >= '17:00')],
  ] as [string, string[]][]).filter(([, list]) => list.length > 0)

  return (
    <Shell>
      {/* ── 1 選服務 ── */}
      {step === 0 && (
        <div key="s0" className="bk-step-content flex flex-col gap-3.5">
          <div className="flex items-center gap-1">
            <Image src="/logo.png" alt="" width={52} height={52} priority />
            <span className="font-heading text-base font-semibold tracking-[0.2em] text-ink">{businessName}</span>
          </div>

          <div className="flex flex-col gap-1.5 px-1">
            <h1 className="text-2xl font-medium leading-[1.4] text-ink">
              {greetingName ? `${greetingName}，今天想做什麼？` : '今天想做什麼？'}
            </h1>
            <Progress current={1} />
          </div>

          {categories.length === 0 ? (
            <LoadingState text="載入服務中" />
          ) : (
            <>
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
                <Chip active={form.category === ''} onClick={() => selectCategory('')}>全部</Chip>
                {categories.map(cat => (
                  <Chip key={cat} active={form.category === cat} onClick={() => selectCategory(cat)}>{cat}</Chip>
                ))}
              </div>

              <button onClick={() => setMode('quiz')}
                className="flex min-h-[52px] items-center justify-between gap-3 rounded-xl border border-dashed border-ink-muted px-[18px] py-2.5 text-left text-ink transition-colors hover:bg-surface">
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">不確定選哪一個？</span>
                  <span className="text-xs text-ink-muted">回答 3 題，幫你推薦適合的服務</span>
                </span>
                <ChevronRight size={18} strokeWidth={1.6} className="shrink-0" />
              </button>

              <div className="flex flex-col gap-3">
                {visibleServices.map(svc => (
                  <div key={svc.id} className="flex items-center gap-3 rounded-2xl bg-surface p-4">
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <span className="font-heading text-[17px] font-semibold text-ink">{svc.name}</span>
                      {serviceDescription(svc.name) && (
                        <span className="text-[13px] leading-relaxed text-ink-soft">{serviceDescription(svc.name)}</span>
                      )}
                      <span className="text-xs text-ink-muted">{svc.category}・{svc.durationMin} 分鐘</span>
                      <span className="num text-[21px] font-semibold leading-tight text-ink">NT$ {svc.price.toLocaleString()}</span>
                    </div>
                    <button onClick={() => selectService(svc.id)}
                      aria-label={`選擇 ${svc.name}`}
                      className={`flex h-11 shrink-0 items-center rounded-full px-[18px] text-[13px] font-medium transition-colors ${
                        form.serviceId === svc.id
                          ? 'bg-ink text-paper'
                          : 'border border-ink text-ink hover:bg-surface-muted'
                      }`}>
                      {form.serviceId === svc.id ? '已選' : '選擇'}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── 2 選時段 ── */}
      {step === 1 && (
        <div key="s1" className="bk-step-content flex flex-1 flex-col gap-3">
          <BackHeader title="選一個時段" progress={2} onBack={() => setStep(0)} />

          <div className="flex items-center justify-between gap-3 rounded-xl bg-surface py-3 pl-[18px] pr-3">
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate font-heading text-base font-semibold text-ink">{selectedService?.name}</span>
              <span className="text-xs text-ink-muted">
                {selectedService ? `${selectedService.durationMin} 分鐘・NT$ ${selectedService.price.toLocaleString()}` : ''}
              </span>
            </span>
            <button onClick={() => setStep(0)}
              className="flex h-11 shrink-0 items-center px-3.5 text-[13px] text-ink underline underline-offset-4">更換</button>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {dates.map(date => {
              const d = compactDate(date)
              const active = form.date === date
              return (
                <button key={date} onClick={() => selectDate(date)} aria-pressed={active}
                  aria-label={formatDate(date)}
                  className={`flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-xl transition-colors ${
                    active ? 'bg-ink text-paper' : 'bg-surface text-ink'
                  }`}>
                  <span className={`text-xs ${active ? '' : 'text-ink-muted'}`}>{d.weekday}</span>
                  <span className="num text-[22px] font-semibold leading-none">{d.day}</span>
                </button>
              )
            })}
          </div>

          <label className="flex min-h-11 items-center justify-end gap-2 pr-1 text-[13px] text-ink">
            其他日期
            <input type="date" min={tomorrow()} max={maxDate()} value={form.date}
              onChange={e => selectDate(e.target.value)}
              className="h-11 rounded-lg border border-border-input bg-surface px-3 text-[15px] text-ink outline-none focus:border-ink" />
          </label>

          <div className="flex flex-1 flex-col gap-2.5 rounded-2xl bg-surface p-4">
            {!form.date ? (
              <p className="py-8 text-center text-sm text-ink-muted">先選一個日期。</p>
            ) : isClosed(form.date, hours) ? (
              <p role="status" className="rounded-lg bg-warn-bg px-4 py-3 text-[13px] text-warn-ink">
                {closedLabel(hours)}，請選擇其他日期。
              </p>
            ) : (
              <>
                <span className="text-[13px] font-bold text-ink">{longDate(form.date)}</span>
                {slotsLoading ? (
                  <LoadingState text="查詢時段中" compact />
                ) : slots.length === 0 ? (
                  <p className="rounded-lg bg-surface-muted px-4 py-4 text-center text-sm text-ink-muted">
                    這天已經約滿了，換一天試試。
                  </p>
                ) : slotGroups.map(([label, list]) => (
                  <div key={label} className="flex flex-col gap-2">
                    <span className="text-xs text-ink-muted">{label}</span>
                    <div className="grid grid-cols-4 gap-2">
                      {list.map(slot => {
                        const active = form.time === slot
                        return (
                          <button key={slot} onClick={() => setField('time', slot)} aria-pressed={active}
                            className={`num h-[46px] rounded-lg text-[19px] font-semibold transition-colors ${
                              active ? 'bg-ink text-paper' : 'border border-border-input text-ink hover:bg-surface-muted'
                            }`}>
                            {slot}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          <button onClick={afterSlot} disabled={!step1Valid}
            className="sticky bottom-3 flex h-[54px] shrink-0 items-center justify-center rounded-full bg-ink text-base font-medium tracking-wider text-paper transition-colors hover:bg-ink-soft disabled:bg-border-input disabled:text-ink-muted">
            {step1Valid ? `下一步　${shortDate(form.date)} ${form.time}` : '請選擇時段'}
          </button>
        </div>
      )}

      {/* ── 聯絡資料（LINE 已帶入時略過；從確認頁按「修改」也會到這裡） ── */}
      {step === 2 && (
        <div key="s2" className="bk-step-content flex flex-1 flex-col gap-3">
          <BackHeader title="怎麼聯絡你" progress={3} onBack={() => setStep(1)} />
          <div className="flex flex-col gap-4 rounded-2xl bg-surface p-5">
            {returning && (
              <p className="rounded-lg bg-sage-fresh px-4 py-2.5 text-[13px] text-visit-green-ink">已由 LINE 帶入你上次的資料，可以直接修改。</p>
            )}
            <Field id="bk-name" label="姓名" value={form.name} onChange={v => setField('name', v)}
              placeholder="請輸入你的姓名" autoComplete="name" />
            <Field id="bk-phone" label="手機號碼" value={form.phone} onChange={v => setField('phone', v)}
              placeholder="09xxxxxxxx" type="tel" autoComplete="tel" hint="用來聯繫與確認預約" />
            <Field id="bk-email" label="電子信箱（選填）" value={form.email} onChange={v => setField('email', v)}
              placeholder="確認信會寄到這裡" type="email" autoComplete="email" />
          </div>
          <button onClick={() => setStep(3)} disabled={!step2Valid}
            className="mt-auto flex h-[54px] shrink-0 items-center justify-center rounded-full bg-ink text-base font-medium tracking-wider text-paper transition-colors hover:bg-ink-soft disabled:bg-border-input disabled:text-ink-muted">
            下一步
          </button>
        </div>
      )}

      {/* ── 3 確認 ── */}
      {step === 3 && (
        <div key="s3" className="bk-step-content flex flex-1 flex-col gap-3">
          <BackHeader title="確認一下" progress={3} onBack={() => setStep(1)} />

          <div className="flex flex-col gap-[18px] rounded-2xl bg-ink px-[22px] py-6 text-paper">
            <div className="flex flex-col gap-1">
              <span className="text-[13px] text-sage-soft">{longDate(form.date)}</span>
              <span className="num text-[56px] font-medium leading-none">{form.time}</span>
            </div>
            <div className="h-px bg-[#4A4A45]" />
            <div className="flex items-end justify-between gap-3">
              <span className="flex min-w-0 flex-col gap-1">
                <span className="font-heading text-[19px] font-semibold tracking-wider">{selectedService?.name}</span>
                <span className="text-[13px] text-[#D9D9D1]">
                  {selectedService ? `${selectedService.durationMin} 分鐘，預計 ${addMinutes(form.time, selectedService.durationMin)} 結束` : ''}
                </span>
              </span>
              <span className="num shrink-0 text-2xl font-semibold">
                {selectedService ? `NT$ ${selectedService.price.toLocaleString()}` : ''}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl bg-surface py-3.5 pl-[18px] pr-3">
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-xs text-ink-muted">預約人{returning ? '（由 LINE 帶入）' : ''}</span>
              <span className="truncate text-[15px] font-medium text-ink">{form.name}　{form.phone}</span>
            </span>
            <button onClick={() => setStep(2)}
              className="flex h-11 shrink-0 items-center px-3.5 text-[13px] text-ink underline underline-offset-4">修改</button>
          </div>

          <div className="flex flex-col gap-2 rounded-xl bg-surface px-[18px] py-4">
            <label htmlFor="bk-note" className="text-[13px] font-medium text-ink">想先告訴我們的事（選填）</label>
            <textarea id="bk-note" rows={3} value={form.note} onChange={e => setField('note', e.target.value)}
              placeholder="例如：身體狀況、過敏史、想加強的部位"
              className="w-full resize-none rounded-lg border border-border-input bg-[#F7F7F3] px-3.5 py-3 text-base leading-relaxed text-ink outline-none placeholder:text-ink-faint focus:border-ink" />
          </div>

          {lineIdToken && (
            <p className="px-1.5 text-[13px] leading-relaxed text-ink-soft">預約前一天會用 LINE 提醒你。</p>
          )}

          <section aria-labelledby="bk-notice-title" className="flex flex-col gap-3 rounded-xl bg-surface px-[18px] py-4">
            <h2 id="bk-notice-title" className="font-heading text-[17px] font-semibold tracking-[0.15em] text-ink">{BOOKING_NOTICE.title}</h2>
            <p className="text-[13px] leading-relaxed text-ink-soft">{BOOKING_NOTICE.intro}</p>
            <ul className="flex flex-col">
              {BOOKING_NOTICE.items.map(item => (
                <li key={item} className="flex gap-2.5 border-b border-dashed border-border-input py-2.5 text-[13px] leading-relaxed text-ink last:border-0">
                  <span aria-hidden="true" className="shrink-0 text-ink-muted">✧</span>{item}
                </li>
              ))}
            </ul>
            <p className="text-[13px] leading-relaxed text-ink-muted">{BOOKING_NOTICE.closing}</p>
            <label className={`flex min-h-[52px] cursor-pointer items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm transition-colors ${
              agreed ? 'bg-sage-fresh text-ink' : 'bg-surface-muted text-ink'
            }`}>
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                className="size-5 shrink-0 cursor-pointer accent-[#1C1C1A]" />
              <span className="font-medium">{BOOKING_NOTICE.agree}</span>
            </label>
          </section>

          {error && (
            <p role="alert" className="rounded-lg bg-visit-red-bg px-4 py-3 text-sm text-visit-red-ink">{error}</p>
          )}

          <button onClick={submit} disabled={submitting || !agreed}
            className="mt-auto flex h-[54px] shrink-0 items-center justify-center gap-2 rounded-full bg-ink text-base font-medium tracking-[0.25em] text-paper transition-colors hover:bg-ink-soft disabled:opacity-60">
            {submitting ? <><Loader2 size={18} className="animate-spin" />送出中</> : agreed ? '送出預約' : '請先勾選同意預約須知'}
          </button>
        </div>
      )}
    </Shell>
  )
}

// ── 小元件 ────────────────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[460px] flex-col gap-3 px-4 pt-3"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}>
      {children}
    </div>
  )
}

/** 三步進度：選服務 → 選時段 → 確認 */
function Progress({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div role="img" aria-label={`步驟 ${current}／3`} className="flex items-center gap-1.5">
      {[1, 2, 3].map(i => (
        <span key={i} className={`h-1 w-6 rounded-full ${i <= current ? 'bg-ink' : 'bg-border-input'}`} />
      ))}
      {current === 1 && <span className="ml-1 text-xs text-ink-muted">選服務 → 選時段 → 確認</span>}
    </div>
  )
}

function BackHeader({ title, progress, onBack }: { title: string; progress?: 1 | 2 | 3; onBack: () => void }) {
  return (
    <div className="flex items-center gap-2.5">
      <button onClick={onBack} aria-label="回上一步"
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface text-ink">
        <ChevronLeft size={18} strokeWidth={1.6} />
      </button>
      <h1 className="flex-1 text-[22px] font-medium text-ink">{title}</h1>
      {progress && <Progress current={progress} />}
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={active}
      className={`h-11 shrink-0 whitespace-nowrap rounded-full px-4 text-[13px] transition-colors ${
        active ? 'bg-ink text-paper' : 'bg-surface text-ink'
      }`}>
      {children}
    </button>
  )
}

function LoadingState({ text, compact }: { text: string; compact?: boolean }) {
  return (
    <div role="status" className={`flex items-center justify-center gap-2 text-sm text-ink-muted ${compact ? 'py-5' : 'py-11'}`}>
      <Loader2 size={18} className="animate-spin" />{text}
    </div>
  )
}

function Field({ id, label, value, onChange, placeholder, type = 'text', autoComplete, hint }: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  autoComplete?: string
  hint?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-ink">{label}</label>
      <input id={id} type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} autoComplete={autoComplete}
        className="h-[50px] w-full rounded-lg border border-border-input bg-[#F7F7F3] px-4 text-base text-ink outline-none placeholder:text-ink-faint focus:border-ink" />
      {hint && <span className="text-xs text-ink-muted">{hint}</span>}
    </div>
  )
}
