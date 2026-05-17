'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, Check, Calendar, Clock, User, Loader2, CheckCircle2 } from 'lucide-react'

// ── 預約頁專屬色盤（溫暖米白 + 鼠尾草綠） ──────────────────────────────────
const C = {
  bg:        '#F6F1EB',
  surface:   '#FFFFFF',
  elevated:  '#F2EDE7',
  border:    '#E4D9CE',
  accent:    '#7B9E87',
  accentH:   '#628B72',
  accentBg:  'rgba(123,158,135,0.10)',
  text:      '#2C2018',
  text2:     '#5C4A3C',
  text3:     '#8C7A6C',
  text4:     '#B8A898',
  warning:   '#C07820',
  danger:    '#C24040',
  dangerBg:  'rgba(194,64,64,0.08)',
  shadow:    '0 4px 20px rgba(44,32,24,0.10), 0 1px 4px rgba(44,32,24,0.06)',
  headerGrad:'linear-gradient(145deg,#8FAF9A,#4D7A62)',
}

type Service = { id: string; name: string; price: number; durationMin: number; category: string }
type ServiceMap = Record<string, Service[]>

type FormData = {
  category:  string
  serviceId: string
  date:      string
  time:      string
  name:      string
  phone:     string
  email:     string
  note:      string
}

const EMPTY: FormData = { category: '', serviceId: '', date: '', time: '', name: '', phone: '', email: '', note: '' }
const STEPS = ['選擇服務', '選擇時間', '填寫資料', '確認送出']

function tomorrow(): string {
  const d = new Date(); d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}
function maxDate(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString().slice(0, 10)
}
function isWeekend(dateStr: string): boolean {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).getDay() === 0
}
function formatDate(d: string): string {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  const wd = ['日','一','二','三','四','五','六'][new Date(Number(y), Number(m) - 1, Number(day)).getDay()]
  return `${y}年${m}月${day}日（週${wd}）`
}

export default function BookForm({ businessName }: { businessName: string }) {
  const [step, setStep]     = useState(0)
  const [form, setForm]     = useState<FormData>(EMPTY)
  const [services, setServices] = useState<ServiceMap>({})
  const [slots, setSlots]   = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [submitting, setSubmitting]     = useState(false)
  const [done, setDone]     = useState<{ code: string; service: string; date: string; time: string } | null>(null)
  const [error, setError]   = useState('')
  const [lineUserId, setLineUserId] = useState('')

  useEffect(() => {
    fetch('/api/book/services').then(r => r.json()).then(setServices).catch(() => {})

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
      } catch { /* not in LIFF — continue */ }
    })()
  }, [])

  const loadSlots = useCallback(async (date: string, serviceId: string) => {
    if (!date || !serviceId) { setSlots([]); return }
    const svc = Object.values(services).flat().find(s => s.id === serviceId)
    if (!svc) return
    setSlotsLoading(true)
    try {
      const r = await fetch(`/api/book/slots?date=${date}&duration=${svc.durationMin}`)
      setSlots(await r.json())
    } catch { setSlots([]) }
    finally { setSlotsLoading(false) }
  }, [services])

  const selectedService = Object.values(services).flat().find(s => s.id === form.serviceId)
  const categories = Object.keys(services)
  const step0Valid = !!form.serviceId
  const step1Valid = !!form.date && !!form.time
  const step2Valid = form.name.trim().length >= 2 && /^09\d{8}$/.test(form.phone.replace(/[-\s]/g, ''))

  function setField<K extends keyof FormData>(k: K, v: FormData[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }
  function selectCategory(cat: string) {
    setField('category', cat); setField('serviceId', ''); setField('time', '')
  }
  function selectService(id: string) {
    setField('serviceId', id); setField('time', '')
    if (form.date) loadSlots(form.date, id)
  }
  function selectDate(d: string) {
    setField('date', d); setField('time', '')
    if (d && form.serviceId) loadSlots(d, form.serviceId)
  }

  async function submit() {
    if (!step2Valid || !step0Valid || !step1Valid) return
    setSubmitting(true); setError('')
    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, lineUserId }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? '預約失敗，請再試一次'); return }
      setDone(data)
    } catch { setError('網路錯誤，請再試一次') }
    finally { setSubmitting(false) }
  }

  // ── 成功畫面 ─────────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: C.bg }}>
        <div style={{ background: C.surface, borderRadius: 24, boxShadow: C.shadow, overflow: 'hidden', maxWidth: 400, width: '100%' }}>
          <div style={{ background: C.headerGrad, padding: '40px 24px', textAlign: 'center' }}>
            <CheckCircle2 size={52} color="white" style={{ margin: '0 auto 12px' }} />
            <div style={{ color: 'white', fontSize: 22, fontWeight: 700 }}>預約成功！</div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 6 }}>{businessName}</div>
          </div>
          <div style={{ padding: '28px 24px' }}>
            <div style={{ background: C.elevated, borderRadius: 14, padding: '4px 16px', marginBottom: 20 }}>
              {[['服務', done.service], ['日期', formatDate(done.date)], ['時間', done.time], ['預約編號', done.code]].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ color: C.text3, fontSize: 14 }}>{label}</span>
                  <span style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>{value}</span>
                </div>
              ))}
            </div>
            {form.email && <p style={{ color: C.text3, fontSize: 13, textAlign: 'center', margin: '0 0 10px' }}>確認信已寄送至 {form.email}</p>}
            <p style={{ color: C.text3, fontSize: 13, textAlign: 'center', margin: 0 }}>期待為您服務 🌿</p>
          </div>
        </div>
      </div>
    )
  }

  // ── 主表單 ───────────────────────────────────────────────────────────────────
  const isDisabled = (step === 0 && !step0Valid) || (step === 1 && !step1Valid) || (step === 2 && !step2Valid)

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 32, background: C.bg }}>
      {/* Header */}
      <div style={{ background: C.headerGrad, padding: '24px 20px 64px' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginBottom: 4 }}>{businessName}</div>
          <div style={{ color: 'white', fontSize: 24, fontWeight: 700, letterSpacing: '-0.3px' }}>線上預約</div>
        </div>
      </div>

      {/* Card */}
      <div style={{ maxWidth: 480, margin: '-44px auto 0', padding: '0 16px' }}>
        <div style={{ background: C.surface, borderRadius: 20, boxShadow: C.shadow, overflow: 'hidden' }}>

          {/* Step indicator */}
          <div style={{ padding: '20px 20px 0', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex' }}>
              {STEPS.map((s, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, transition: 'all 0.2s',
                    background: i <= step ? C.accent : C.border,
                    color: i <= step ? 'white' : C.text4,
                  }}>
                    {i < step ? <Check size={14} /> : i + 1}
                  </div>
                  <div style={{ fontSize: 10, paddingBottom: 12, whiteSpace: 'nowrap', color: i <= step ? C.accent : C.text4, fontWeight: i === step ? 600 : 400 }}>
                    {s}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div style={{ padding: '24px 20px' }}>

            {/* Step 0 — 選擇服務 */}
            {step === 0 && (
              <div>
                <Title icon={<User size={16} />} label="選擇服務類別" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  {categories.length === 0 && (
                    <div style={{ textAlign: 'center', color: C.text3, padding: '32px 0' }}>
                      <Loader2 size={24} style={{ margin: '0 auto 8px', opacity: 0.4 }} className="animate-spin" />
                      載入服務中…
                    </div>
                  )}
                  {categories.map(cat => (
                    <button key={cat} onClick={() => selectCategory(cat)} style={{
                      padding: '14px 16px', borderRadius: 12, textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s',
                      border: `2px solid ${form.category === cat ? C.accent : C.border}`,
                      background: form.category === cat ? C.accentBg : 'transparent',
                      color: form.category === cat ? C.accent : C.text, fontWeight: 600, fontSize: 15,
                    }}>{cat}</button>
                  ))}
                </div>

                {form.category && <>
                  <Title icon={<Check size={16} />} label="選擇項目" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(services[form.category] ?? []).map(svc => (
                      <button key={svc.id} onClick={() => selectService(svc.id)} style={{
                        padding: '14px 16px', borderRadius: 12, textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s',
                        border: `2px solid ${form.serviceId === svc.id ? C.accent : C.border}`,
                        background: form.serviceId === svc.id ? C.accentBg : 'transparent',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: form.serviceId === svc.id ? C.accent : C.text, fontWeight: 600, fontSize: 15 }}>{svc.name}</span>
                          <span style={{ color: C.accent, fontWeight: 700, fontSize: 15 }}>NT$ {svc.price.toLocaleString()}</span>
                        </div>
                        <div style={{ color: C.text3, fontSize: 13, marginTop: 4 }}>{svc.durationMin} 分鐘</div>
                      </button>
                    ))}
                  </div>
                </>}
              </div>
            )}

            {/* Step 1 — 日期 & 時段 */}
            {step === 1 && (
              <div>
                <Title icon={<Calendar size={16} />} label="選擇日期" />
                <input type="date" min={tomorrow()} max={maxDate()} value={form.date}
                  onChange={e => { if (!isWeekend(e.target.value)) selectDate(e.target.value) }}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, marginBottom: 20, boxSizing: 'border-box', outline: 'none', fontSize: 15,
                    border: `2px solid ${C.border}`, background: C.bg, color: C.text }} />
                {form.date && isWeekend(form.date) && (
                  <p style={{ color: C.warning, fontSize: 13, marginTop: -16, marginBottom: 16 }}>⚠️ 週日公休，請選擇其他日期</p>
                )}
                {form.date && !isWeekend(form.date) && <>
                  <Title icon={<Clock size={16} />} label={`${formatDate(form.date)} 可預約時段`} />
                  {slotsLoading ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: C.text3 }}>
                      <Loader2 size={20} style={{ margin: '0 auto 8px' }} className="animate-spin" />查詢時段中…
                    </div>
                  ) : slots.length === 0 ? (
                    <p style={{ color: C.text3, textAlign: 'center', padding: '20px 0', fontSize: 14 }}>當天已無可預約時段，請選擇其他日期</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                      {slots.map(slot => (
                        <button key={slot} onClick={() => setField('time', slot)} style={{
                          padding: '12px 0', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s', fontWeight: 600, fontSize: 15,
                          border: `2px solid ${form.time === slot ? C.accent : C.border}`,
                          background: form.time === slot ? C.accent : 'transparent',
                          color: form.time === slot ? 'white' : C.text,
                        }}>{slot}</button>
                      ))}
                    </div>
                  )}
                </>}
              </div>
            )}

            {/* Step 2 — 填寫資料 */}
            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Title icon={<User size={16} />} label="填寫聯絡資料" />
                <Field label="姓名 *" value={form.name} onChange={v => setField('name', v)} placeholder="請輸入您的姓名" />
                <Field label="手機號碼 *" value={form.phone} onChange={v => setField('phone', v)} placeholder="09xxxxxxxx" type="tel" />
                <Field label="電子信箱（選填）" value={form.email} onChange={v => setField('email', v)} placeholder="預約確認信將寄至此信箱" type="email" />
                <div>
                  <label style={{ display: 'block', color: C.text2, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>備註（選填）</label>
                  <textarea value={form.note} onChange={e => setField('note', e.target.value)}
                    placeholder="身體狀況、過敏史、特殊需求等…" rows={3}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 12, fontSize: 15, resize: 'none', boxSizing: 'border-box', outline: 'none',
                      border: `2px solid ${C.border}`, background: C.bg, color: C.text }} />
                </div>
              </div>
            )}

            {/* Step 3 — 確認 */}
            {step === 3 && (
              <div>
                <Title icon={<Check size={16} />} label="確認預約資料" />
                <div style={{ background: C.elevated, borderRadius: 14, padding: '4px 16px', marginBottom: 20 }}>
                  {([
                    ['服務', selectedService?.name ?? ''],
                    ['費用', selectedService ? `NT$ ${selectedService.price.toLocaleString()}` : ''],
                    ['時長', selectedService ? `${selectedService.durationMin} 分鐘` : ''],
                    ['日期', formatDate(form.date)],
                    ['時間', form.time],
                    ['姓名', form.name],
                    ['電話', form.phone],
                    ['Email', form.email || '（未填寫）'],
                    ...(form.note ? [['備註', form.note]] : []),
                  ] as [string, string][]).map(([label, value]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ color: C.text3, fontSize: 14, flexShrink: 0, marginRight: 12 }}>{label}</span>
                      <span style={{ color: C.text, fontWeight: 600, fontSize: 14, textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
                    </div>
                  ))}
                </div>
                {error && (
                  <p style={{ color: C.danger, background: C.dangerBg, borderRadius: 10, padding: '10px 14px', fontSize: 14, marginBottom: 16 }}>{error}</p>
                )}
                <button onClick={submit} disabled={submitting} style={{
                  width: '100%', padding: '16px', borderRadius: 12, border: 'none', fontWeight: 700, fontSize: 16,
                  background: submitting ? C.border : C.accent, color: 'white',
                  cursor: submitting ? 'not-allowed' : 'pointer', transition: 'background 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  {submitting ? <><Loader2 size={18} className="animate-spin" />送出中…</> : '✅ 確認送出預約'}
                </button>
              </div>
            )}
          </div>

          {/* Nav buttons */}
          <div style={{ padding: '0 20px 20px', display: 'flex', gap: 10 }}>
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} style={{
                padding: '13px 18px', borderRadius: 12, cursor: 'pointer', fontWeight: 600, fontSize: 15,
                border: `2px solid ${C.border}`, background: 'transparent', color: C.text2,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <ChevronLeft size={18} />上一步
              </button>
            )}
            {step < 3 && (
              <button onClick={() => setStep(s => s + 1)} disabled={isDisabled} style={{
                flex: 1, padding: '13px 0', borderRadius: 12, border: 'none', fontWeight: 700, fontSize: 15,
                background: isDisabled ? C.border : C.accent, color: 'white',
                cursor: isDisabled ? 'not-allowed' : 'pointer', transition: 'background 0.15s',
              }}>
                下一步
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 共用元件 ──────────────────────────────────────────────────────────────────

function Title({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <div style={{ color: C.accent }}>{icon}</div>
      <span style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>{label}</span>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div>
      <label style={{ display: 'block', color: C.text2, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '12px 14px', borderRadius: 12, fontSize: 15, boxSizing: 'border-box', outline: 'none',
          border: `2px solid ${C.border}`, background: C.bg, color: C.text }} />
    </div>
  )
}
