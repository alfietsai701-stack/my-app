'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import {
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Loader2,
  Mail,
  MessageSquareText,
  Phone,
  Sparkles,
  User,
} from 'lucide-react'

const C = {
  bg: '#F8F1E6',
  surface: '#FFFDFC',
  elevated: '#FAF4EA',
  border: '#E4D3BE',
  borderStrong: '#DCC7AA',
  accent: '#B99868',
  accentH: '#9B744A',
  accentBg: 'rgba(185,152,104,0.14)',
  dark: '#33281E',
  dark2: '#3B2D22',
  text: '#33281E',
  text2: '#5E4C3D',
  text3: '#76685B',
  text4: '#9A8A7B',
  warning: '#B8842B',
  danger: '#B85C50',
  dangerBg: 'rgba(184,92,80,0.10)',
  success: '#6F8F74',
  shadow: '0 18px 50px rgba(51,40,30,0.12)',
}

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
const STEPS = ['服務', '日期時段', '聯絡資料', '確認']

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
  const [lineUserId, setLineUserId] = useState('')
  const [hours, setHours] = useState<BusinessHours>(DEFAULT_HOURS)
  const [returning, setReturning] = useState(false)
  const slotCacheRef = useRef(new Map<string, string[]>())
  const slotRequestRef = useRef(0)

  useEffect(() => {
    fetch('/api/book/services').then(r => r.json()).then((data: ServiceMap) => {
      setServices(data)
      const firstCategory = Object.keys(data)[0]
      if (firstCategory) setForm(prev => prev.category ? prev : { ...prev, category: firstCategory })
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
        setLineUserId(profile.userId)
        setForm(prev => ({ ...prev, name: prev.name || profile.displayName || '' }))

        // 老客自動帶入上次的基本資料，省去重複輸入
        try {
          const r = await fetch(`/api/book/customer?lineUserId=${encodeURIComponent(profile.userId)}`)
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
  const visibleServices = form.category ? services[form.category] ?? [] : []
  const dates = useMemo(() => quickDates(hours), [hours])
  const step0Valid = !!form.serviceId
  const step1Valid = !!form.date && !!form.time && !isClosed(form.date, hours)
  const step2Valid = form.name.trim().length >= 2 && /^09\d{8}$/.test(form.phone.replace(/[-\s]/g, ''))
  const isDisabled = (step === 0 && !step0Valid) || (step === 1 && !step1Valid) || (step === 2 && !step2Valid)

  function setField<K extends keyof FormData>(k: K, v: FormData[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  function selectCategory(cat: string) {
    setForm(prev => ({ ...prev, category: cat, serviceId: '', time: '' }))
    setSlots([])
  }

  function selectService(id: string) {
    setField('serviceId', id)
    setField('time', '')
    if (form.date) loadSlots(form.date, id)
  }

  function selectDate(d: string) {
    setField('date', d)
    setField('time', '')
    if (d && form.serviceId) loadSlots(d, form.serviceId)
  }

  async function submit() {
    if (!step2Valid || !step0Valid || !step1Valid) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, lineUserId }),
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

  if (done) {
    return (
      <div style={pageCenter}>
        <div style={successCard} className="bk-success-card">
          <div style={successMark} className="bk-success-mark">
            <CheckCircle2 size={42} color="white" />
          </div>
          <p style={{ color: C.accentH, fontSize: 12, fontWeight: 700, letterSpacing: '0.26em', margin: '0 0 10px' }}>
            BOOKING CONFIRMED
          </p>
          <h1 style={{ color: C.text, fontSize: 28, fontWeight: 700, margin: 0 }}>預約成功</h1>
          <p style={{ color: C.text3, fontSize: 14, lineHeight: 1.7, margin: '10px 0 24px' }}>
            我們已收到您的預約，請保留以下資訊。
          </p>
          <div style={summaryBox}>
            {[['服務', done.service], ['日期', formatDate(done.date)], ['時間', done.time], ['預約編號', done.code]].map(([label, value]) => (
              <SummaryRow key={label} label={label} value={value} />
            ))}
          </div>
          {form.email && <p style={{ color: C.text3, fontSize: 13, textAlign: 'center', margin: '18px 0 0' }}>確認信已寄送至 {form.email}</p>}
        </div>
      </div>
    )
  }

  return (
    <div style={pageShell}>
      <main style={layout}>
        <aside style={brandPanel}>
          <div>
            <div style={brandIcon}><Sparkles size={18} /></div>
            <p style={eyebrow}>ONLINE BOOKING</p>
            <h1 style={brandTitle}>{businessName}</h1>
            <p style={brandText}>選擇服務、日期與時段，免登入即可完成預約。</p>
          </div>

          <div style={brandInfoGrid}>
            <InfoTile label="流程" value="4 步完成" />
            <InfoTile label="預約" value="即時確認" />
            <InfoTile label="通知" value="LINE / Email" />
            <InfoTile label="營業" value={closedLabel(hours)} />
          </div>
        </aside>

        <section style={card}>
          <div style={cardHeader}>
            <div>
              <p style={eyebrow}>RESERVATION</p>
              <h2 style={{ color: C.text, fontSize: 24, fontWeight: 700, margin: '4px 0 0' }}>線上預約</h2>
            </div>
            <div style={priceHint}>{selectedService ? `NT$ ${selectedService.price.toLocaleString()}` : '選擇服務'}</div>
          </div>

          <Stepper step={step} />

          <div style={content}>
            <div key={step} className="bk-step-content">
            {step === 0 && (
              <section>
                <SectionTitle icon={<Sparkles size={17} />} title="選擇服務" subtitle="先選分類，再選擇想預約的項目。" />

                {categories.length === 0 ? (
                  <LoadingState text="載入服務中" />
                ) : (
                  <>
                    <div style={categoryTabs}>
                      {categories.map(cat => (
                        <button key={cat} onClick={() => selectCategory(cat)} style={tabStyle(form.category === cat)}>
                          {cat}
                        </button>
                      ))}
                    </div>

                    <div style={serviceList}>
                      {visibleServices.map(svc => (
                        <button key={svc.id} onClick={() => selectService(svc.id)} style={serviceStyle(form.serviceId === svc.id)} className="bk-service">
                          <div>
                            <p style={{ color: form.serviceId === svc.id ? C.accentH : C.text, fontSize: 15, fontWeight: 700, margin: 0 }}>{svc.name}</p>
                            <p style={{ color: C.text4, fontSize: 13, margin: '6px 0 0' }}>{svc.durationMin} 分鐘</p>
                          </div>
                          <div style={{ color: C.accentH, fontSize: 15, fontWeight: 800 }}>NT$ {svc.price.toLocaleString()}</div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </section>
            )}

            {step === 1 && (
              <section>
                <SectionTitle icon={<Calendar size={17} />} title="選擇日期與時段" subtitle="可先點選快捷日期，或使用日期選擇器。" />

                <div style={selectedServiceBar}>
                  <div>
                    <p style={{ color: C.text4, fontSize: 12, margin: 0 }}>已選服務</p>
                    <p style={{ color: C.text, fontSize: 14, fontWeight: 700, margin: '3px 0 0' }}>{selectedService?.name}</p>
                  </div>
                  <button onClick={() => setStep(0)} style={plainButton}>更換</button>
                </div>

                <div style={dateStrip}>
                  {dates.map(date => {
                    const d = compactDate(date)
                    const active = form.date === date
                    return (
                      <button key={date} onClick={() => selectDate(date)} style={dateChipStyle(active)} className="bk-chip">
                        <span style={{ fontSize: 11, color: active ? '#FFFFFF' : C.text4 }}>{d.month}</span>
                        <strong style={{ fontSize: 20, lineHeight: 1, color: active ? '#FFFFFF' : C.text }}>{d.day}</strong>
                        <span style={{ fontSize: 11, color: active ? 'rgba(255,255,255,0.78)' : C.text3 }}>{d.weekday}</span>
                      </button>
                    )
                  })}
                </div>

                <label style={datePickerLabel}>
                  <span>其他日期</span>
                  <input
                    type="date"
                    min={tomorrow()}
                    max={maxDate()}
                    value={form.date}
                    onChange={e => selectDate(e.target.value)}
                    style={dateInput}
                  />
                </label>

                {form.date && isClosed(form.date, hours) && (
                  <p style={warningText}>{closedLabel(hours)}，請選擇其他日期。</p>
                )}

                {form.date && !isClosed(form.date, hours) && (
                  <div style={{ marginTop: 22 }}>
                    <SectionTitle icon={<Clock size={17} />} title="可預約時段" subtitle={formatDate(form.date)} dense />
                    {slotsLoading ? (
                      <LoadingState text="查詢時段中" compact />
                    ) : slots.length === 0 ? (
                      <EmptyState text="當天已無可預約時段，請選擇其他日期。" />
                    ) : (
                      <div style={slotGrid}>
                        {slots.map(slot => (
                          <button key={slot} onClick={() => setField('time', slot)} style={slotStyle(form.time === slot)} className="bk-chip">
                            {slot}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {step === 2 && (
              <section>
                <SectionTitle icon={<User size={17} />} title="填寫聯絡資料" subtitle="手機號碼用於聯繫與確認預約。" />
                {returning && (
                  <p className="text-xs" style={{ color: C.success }}>✓ 已透過 LINE 帶入您上次的預約資料，可直接確認或修改。</p>
                )}
                <div style={fieldGrid}>
                  <Field icon={<User size={16} />} label="姓名 *" value={form.name} onChange={v => setField('name', v)} placeholder="請輸入您的姓名" />
                  <Field icon={<Phone size={16} />} label="手機號碼 *" value={form.phone} onChange={v => setField('phone', v)} placeholder="09xxxxxxxx" type="tel" />
                  <Field icon={<Mail size={16} />} label="電子信箱（選填）" value={form.email} onChange={v => setField('email', v)} placeholder="預約確認信將寄至此信箱" type="email" />
                  <div>
                    <Label icon={<MessageSquareText size={16} />} label="備註（選填）" />
                    <textarea
                      value={form.note}
                      onChange={e => setField('note', e.target.value)}
                      placeholder="身體狀況、過敏史、特殊需求等"
                      rows={4}
                      style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
                    />
                  </div>
                </div>
              </section>
            )}

            {step === 3 && (
              <section>
                <SectionTitle icon={<Check size={17} />} title="確認預約資料" subtitle="請確認資料無誤後送出。" />
                <div style={summaryBox}>
                  <SummaryRow label="服務" value={selectedService?.name ?? ''} />
                  <SummaryRow label="費用" value={selectedService ? `NT$ ${selectedService.price.toLocaleString()}` : ''} />
                  <SummaryRow label="時長" value={selectedService ? `${selectedService.durationMin} 分鐘` : ''} />
                  <SummaryRow label="日期" value={formatDate(form.date)} />
                  <SummaryRow label="時間" value={form.time} />
                  <SummaryRow label="姓名" value={form.name} />
                  <SummaryRow label="電話" value={form.phone} />
                  <SummaryRow label="Email" value={form.email || '（未填寫）'} />
                  {form.note && <SummaryRow label="備註" value={form.note} />}
                </div>
                {error && <p style={errorText}>{error}</p>}
                <button onClick={submit} disabled={submitting} style={submitButton(submitting)}>
                  {submitting ? <><Loader2 size={18} className="animate-spin" />送出中</> : '確認送出預約'}
                </button>
              </section>
            )}
            </div>
          </div>

          <div style={navBar}>
            {step > 0 ? (
              <button onClick={() => setStep(s => s - 1)} style={backButton} className="bk-nav-btn">
                <ChevronLeft size={18} />上一步
              </button>
            ) : <div />}
            {step < 3 && (
              <button onClick={() => setStep(s => s + 1)} disabled={isDisabled} style={nextButton(isDisabled)} className="bk-nav-btn">
                下一步
              </button>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

function Stepper({ step }: { step: number }) {
  return (
    <div style={stepper}>
      {STEPS.map((label, i) => {
        const active = i <= step
        return (
          <div key={label} style={stepItem}>
            <div style={stepDot(active, i < step)}>{i < step ? <Check size={13} /> : i + 1}</div>
            <span style={{ color: active ? C.accentH : C.text4, fontSize: 11, fontWeight: active ? 700 : 500 }}>{label}</span>
          </div>
        )
      })}
    </div>
  )
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoTile}>
      <p style={{ color: 'rgba(255,255,255,0.58)', fontSize: 11, margin: 0 }}>{label}</p>
      <p style={{ color: '#FFFFFF', fontSize: 14, fontWeight: 700, margin: '5px 0 0' }}>{value}</p>
    </div>
  )
}

function SectionTitle({ icon, title, subtitle, dense }: { icon: ReactNode; title: string; subtitle?: string; dense?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: dense ? 12 : 20 }}>
      <div style={sectionIcon}>{icon}</div>
      <div>
        <h3 style={{ color: C.text, fontSize: 17, fontWeight: 750, margin: 0 }}>{title}</h3>
        {subtitle && <p style={{ color: C.text4, fontSize: 13, margin: '3px 0 0', lineHeight: 1.6 }}>{subtitle}</p>}
      </div>
    </div>
  )
}

function LoadingState({ text, compact }: { text: string; compact?: boolean }) {
  return (
    <div style={{ color: C.text3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: compact ? '18px 0' : '44px 0', fontSize: 14 }}>
      <Loader2 size={18} className="animate-spin" />{text}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <div style={{ color: C.text3, background: C.elevated, border: `1px solid ${C.border}`, padding: 16, fontSize: 14, textAlign: 'center' }}>{text}</div>
}

function Label({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 7, color: C.text2, fontSize: 13, fontWeight: 700, marginBottom: 7 }}>
      <span style={{ color: C.accentH }}>{icon}</span>{label}
    </label>
  )
}

function Field({ icon, label, value, onChange, placeholder, type = 'text' }: {
  icon: ReactNode
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div>
      <Label icon={icon} label={label} />
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={summaryRow}>
      <span style={{ color: C.text4, fontSize: 13, flexShrink: 0 }}>{label}</span>
      <span style={{ color: C.text, fontSize: 14, fontWeight: 700, textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
    </div>
  )
}

const pageShell: CSSProperties = {
  minHeight: '100vh',
  background: C.bg,
  padding: '28px 16px',
}

const layout: CSSProperties = {
  width: '100%',
  maxWidth: 1120,
  margin: '0 auto',
  display: 'flex',
  flexWrap: 'wrap',
  gap: 24,
  alignItems: 'stretch',
}

const brandPanel: CSSProperties = {
  flex: '1 1 320px',
  minWidth: 0,
  background: `linear-gradient(145deg, ${C.dark2}, ${C.accent})`,
  minHeight: 420,
  padding: 34,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  color: '#FFFFFF',
}

const brandIcon: CSSProperties = {
  width: 42,
  height: 42,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid rgba(255,255,255,0.26)',
  background: 'rgba(255,255,255,0.12)',
  marginBottom: 28,
}

const eyebrow: CSSProperties = {
  color: C.accentH,
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: '0.24em',
  margin: 0,
}

const brandTitle: CSSProperties = {
  color: '#FFFFFF',
  fontSize: 34,
  lineHeight: 1.2,
  fontWeight: 750,
  margin: '12px 0 0',
}

const brandText: CSSProperties = {
  color: 'rgba(255,255,255,0.74)',
  fontSize: 15,
  lineHeight: 1.8,
  maxWidth: 360,
  margin: '18px 0 0',
}

const brandInfoGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 1,
  background: 'rgba(255,255,255,0.18)',
  border: '1px solid rgba(255,255,255,0.18)',
}

const infoTile: CSSProperties = {
  background: 'rgba(59,45,34,0.32)',
  padding: 16,
}

const card: CSSProperties = {
  flex: '1 1 380px',
  minWidth: 0,
  background: C.surface,
  border: `1px solid ${C.border}`,
  boxShadow: C.shadow,
  minHeight: 620,
  display: 'flex',
  flexDirection: 'column',
}

const cardHeader: CSSProperties = {
  padding: '24px 24px 18px',
  borderBottom: `1px solid ${C.border}`,
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  alignItems: 'flex-start',
}

const priceHint: CSSProperties = {
  color: C.accentH,
  background: C.accentBg,
  border: `1px solid ${C.borderStrong}`,
  padding: '8px 10px',
  fontSize: 12,
  fontWeight: 800,
  whiteSpace: 'nowrap',
}

const stepper: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: 6,
  padding: '16px 20px',
  borderBottom: `1px solid ${C.border}`,
  background: C.elevated,
}

const stepItem: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
  minWidth: 0,
}

const sectionIcon: CSSProperties = {
  width: 34,
  height: 34,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  color: C.accentH,
  background: C.accentBg,
  border: `1px solid ${C.border}`,
}

const stepDot = (active: boolean, done: boolean): CSSProperties => ({
  width: 26,
  height: 26,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 999,
  background: active ? C.accent : C.surface,
  color: active ? '#FFFFFF' : C.text4,
  border: `1px solid ${active ? C.accent : C.borderStrong}`,
  fontSize: done ? 0 : 12,
  fontWeight: 800,
  transition: 'background 0.25s, border-color 0.25s, color 0.25s',
})

const content: CSSProperties = {
  padding: 24,
  flex: 1,
}

const categoryTabs: CSSProperties = {
  display: 'flex',
  gap: 8,
  overflowX: 'auto',
  paddingBottom: 6,
  marginBottom: 18,
}

const tabStyle = (active: boolean): CSSProperties => ({
  border: `1px solid ${active ? C.accent : C.border}`,
  background: active ? C.dark : C.surface,
  color: active ? '#FFFFFF' : C.text2,
  padding: '10px 14px',
  fontSize: 13,
  fontWeight: 750,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  transition: 'background 0.18s, border-color 0.18s, color 0.18s',
})

const serviceList: CSSProperties = {
  display: 'grid',
  gap: 10,
}

const serviceStyle = (active: boolean): CSSProperties => ({
  width: '100%',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 16,
  textAlign: 'left',
  border: `1.5px solid ${active ? C.accent : C.border}`,
  background: active ? C.accentBg : C.surface,
  padding: '16px 15px',
  cursor: 'pointer',
  transition: 'background 0.18s, border-color 0.18s',
})

const selectedServiceBar: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 16,
  background: C.elevated,
  border: `1px solid ${C.border}`,
  padding: 14,
  marginBottom: 18,
}

const plainButton: CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: C.accentH,
  fontSize: 13,
  fontWeight: 800,
  cursor: 'pointer',
}

const dateStrip: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, minmax(68px, 1fr))',
  gap: 8,
  overflowX: 'auto',
  paddingBottom: 6,
}

const dateChipStyle = (active: boolean): CSSProperties => ({
  minHeight: 72,
  border: `1.5px solid ${active ? C.accent : C.border}`,
  background: active ? C.accent : C.surface,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 5,
  cursor: 'pointer',
  transition: 'background 0.18s, border-color 0.18s',
})

const datePickerLabel: CSSProperties = {
  marginTop: 14,
  display: 'grid',
  gridTemplateColumns: '92px 1fr',
  alignItems: 'center',
  border: `1px solid ${C.border}`,
  background: C.elevated,
  color: C.text2,
  fontSize: 13,
  fontWeight: 700,
  padding: '8px 12px',
}

const dateInput: CSSProperties = {
  width: '100%',
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: C.text,
  fontSize: 15,
}

const warningText: CSSProperties = {
  color: C.warning,
  background: 'rgba(184,132,43,0.10)',
  border: `1px solid rgba(184,132,43,0.22)`,
  padding: '10px 12px',
  fontSize: 13,
  margin: '14px 0 0',
}

const slotGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 8,
}

const slotStyle = (active: boolean): CSSProperties => ({
  height: 46,
  border: `1.5px solid ${active ? C.accent : C.border}`,
  background: active ? C.accent : C.surface,
  color: active ? '#FFFFFF' : C.text,
  fontSize: 15,
  fontWeight: 800,
  cursor: 'pointer',
  transition: 'background 0.18s, border-color 0.18s, color 0.18s',
})

const fieldGrid: CSSProperties = {
  display: 'grid',
  gap: 16,
}

const inputStyle: CSSProperties = {
  width: '100%',
  border: `1.5px solid ${C.border}`,
  background: C.elevated,
  color: C.text,
  padding: '12px 13px',
  fontSize: 15,
  outline: 'none',
  boxSizing: 'border-box',
}

const summaryBox: CSSProperties = {
  background: C.elevated,
  border: `1px solid ${C.border}`,
  padding: '4px 15px',
}

const summaryRow: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  padding: '12px 0',
  borderBottom: `1px solid ${C.border}`,
}

const errorText: CSSProperties = {
  color: C.danger,
  background: C.dangerBg,
  padding: '11px 13px',
  fontSize: 14,
  margin: '16px 0 0',
}

const submitButton = (loading: boolean): CSSProperties => ({
  width: '100%',
  border: 'none',
  background: loading ? C.borderStrong : C.dark,
  color: '#FFFFFF',
  padding: '15px 16px',
  fontSize: 15,
  fontWeight: 800,
  cursor: loading ? 'not-allowed' : 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  marginTop: 18,
})

const navBar: CSSProperties = {
  borderTop: `1px solid ${C.border}`,
  padding: 18,
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
}

const backButton: CSSProperties = {
  border: `1.5px solid ${C.borderStrong}`,
  background: 'transparent',
  color: C.text2,
  padding: '12px 15px',
  fontSize: 14,
  fontWeight: 800,
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  cursor: 'pointer',
}

const nextButton = (disabled: boolean): CSSProperties => ({
  marginLeft: 'auto',
  border: 'none',
  background: disabled ? C.border : C.dark,
  color: '#FFFFFF',
  padding: '12px 24px',
  fontSize: 14,
  fontWeight: 800,
  cursor: disabled ? 'not-allowed' : 'pointer',
  minWidth: 140,
})

const pageCenter: CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 18,
  background: C.bg,
}

const successCard: CSSProperties = {
  width: '100%',
  maxWidth: 430,
  background: C.surface,
  border: `1px solid ${C.border}`,
  boxShadow: C.shadow,
  padding: 30,
  textAlign: 'center',
}

const successMark: CSSProperties = {
  width: 72,
  height: 72,
  background: C.success,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  margin: '0 auto 20px',
}
