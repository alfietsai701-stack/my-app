'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, Check, Calendar, Clock, User, Loader2, CheckCircle2 } from 'lucide-react'

type Service = { id: string; name: string; price: number; durationMin: number; category: string }
type ServiceMap = Record<string, Service[]>

type FormData = {
  category:   string
  serviceId:  string
  date:       string
  time:       string
  name:       string
  phone:      string
  email:      string
  note:       string
}

const EMPTY: FormData = { category: '', serviceId: '', date: '', time: '', name: '', phone: '', email: '', note: '' }

const STEPS = ['選擇服務', '選擇時間', '填寫資料', '確認送出']

// Date helpers
function tomorrow(): string {
  const d = new Date(); d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}
function maxDate(): string {
  const now = new Date()
  const last = new Date(now.getFullYear(), now.getMonth() + 2, 0)
  return last.toISOString().slice(0, 10)
}
function isWeekend(dateStr: string): boolean {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).getDay() === 0
}
function formatDate(d: string): string {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  const weekdays = ['日','一','二','三','四','五','六']
  const wd = weekdays[new Date(Number(y), Number(m) - 1, Number(day)).getDay()]
  return `${y}年${m}月${day}日（週${wd}）`
}

export default function BookForm({ businessName }: { businessName: string }) {
  const [step, setStep]         = useState(0)
  const [form, setForm]         = useState<FormData>(EMPTY)
  const [services, setServices] = useState<ServiceMap>({})
  const [slots, setSlots]       = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [submitting, setSubmitting]     = useState(false)
  const [done, setDone]         = useState<{ code: string; service: string; date: string; time: string } | null>(null)
  const [error, setError]       = useState('')
  const [lineUserId, setLineUserId] = useState('')

  // Load services on mount + init LIFF
  useEffect(() => {
    fetch('/api/book/services')
      .then(r => r.json())
      .then(setServices)
      .catch(() => {})

    const liffId = process.env.NEXT_PUBLIC_LIFF_ID
    if (!liffId) return
    ;(async () => {
      try {
        const liff = (await import('@line/liff')).default
        await liff.init({ liffId })
        if (!liff.isLoggedIn()) { liff.login(); return }
        const profile = await liff.getProfile()
        setLineUserId(profile.userId)
        setForm(prev => ({ ...prev, name: prev.name || profile.displayName || '' }))
      } catch {
        // not in LIFF environment — continue without LINE ID
      }
    })()
  }, [])

  // Load time slots whenever date or service changes
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

  // ── Derived values ──────────────────────────────────────────────────────────
  const selectedService = Object.values(services).flat().find(s => s.id === form.serviceId)
  const categories = Object.keys(services)

  const step0Valid = !!form.serviceId
  const step1Valid = !!form.date && !!form.time
  const step2Valid = form.name.trim().length >= 2 && /^09\d{8}$/.test(form.phone.replace(/[-\s]/g, ''))

  function setField<K extends keyof FormData>(k: K, v: FormData[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  function selectCategory(cat: string) {
    setField('category', cat)
    setField('serviceId', '')
    setField('time', '')
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
      if (!res.ok) { setError(data.error ?? '預約失敗，請再試一次'); return }
      setDone(data)
    } catch { setError('網路錯誤，請再試一次') }
    finally { setSubmitting(false) }
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--t-bg)' }}>
        <div style={{ background: 'var(--t-surface)', borderRadius: 24, boxShadow: 'var(--t-shadow-md)', overflow: 'hidden', maxWidth: 400, width: '100%' }}>
          <div style={{ background: 'linear-gradient(145deg,#1255CC,#082E80)', padding: '40px 24px', textAlign: 'center' }}>
            <CheckCircle2 size={52} color="white" style={{ margin: '0 auto 12px' }} />
            <div style={{ color: 'white', fontSize: 22, fontWeight: 700 }}>預約成功！</div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 6 }}>{businessName}</div>
          </div>
          <div style={{ padding: '28px 24px' }}>
            <div style={{ background: 'var(--t-elevated)', borderRadius: 14, padding: '20px 18px', marginBottom: 20 }}>
              {[
                ['服務', done.service],
                ['日期', formatDate(done.date)],
                ['時間', done.time],
                ['預約編號', done.code],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--t-border)' }}>
                  <span style={{ color: 'var(--t-text-3)', fontSize: 14 }}>{label}</span>
                  <span style={{ color: 'var(--t-text)', fontWeight: 600, fontSize: 14 }}>{value}</span>
                </div>
              ))}
            </div>
            {form.email && (
              <p style={{ color: 'var(--t-text-3)', fontSize: 13, textAlign: 'center', margin: '0 0 12px' }}>
                確認信已寄送至 {form.email}
              </p>
            )}
            <p style={{ color: 'var(--t-text-3)', fontSize: 13, textAlign: 'center', margin: 0 }}>
              期待為您服務 🌿
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Main form ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-8" style={{ background: 'var(--t-bg)' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(145deg,#1255CC,#082E80)', padding: '20px 20px 60px' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 4 }}>{businessName}</div>
          <div style={{ color: 'white', fontSize: 22, fontWeight: 700 }}>線上預約</div>
        </div>
      </div>

      {/* Card */}
      <div style={{ maxWidth: 480, margin: '-40px auto 0', padding: '0 16px' }}>
        <div style={{ background: 'var(--t-surface)', borderRadius: 20, boxShadow: 'var(--t-shadow-md)', overflow: 'hidden' }}>
          {/* Step progress */}
          <div style={{ padding: '20px 20px 0', borderBottom: '1px solid var(--t-border)' }}>
            <div style={{ display: 'flex', gap: 0 }}>
              {STEPS.map((s, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
                    background: i < step ? 'var(--t-accent)' : i === step ? 'var(--t-accent)' : 'var(--t-border)',
                    color: i <= step ? 'white' : 'var(--t-text-4)',
                    transition: 'all 0.2s',
                  }}>
                    {i < step ? <Check size={14} /> : i + 1}
                  </div>
                  <div style={{ fontSize: 10, color: i <= step ? 'var(--t-accent)' : 'var(--t-text-4)', fontWeight: i === step ? 600 : 400, paddingBottom: 12, whiteSpace: 'nowrap' }}>
                    {s}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Step content */}
          <div style={{ padding: '24px 20px' }}>
            {/* ── Step 0: Select service ── */}
            {step === 0 && (
              <div>
                <SectionTitle icon={<User size={16} />} title="選擇服務類別" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  {categories.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--t-text-3)', padding: '32px 0' }}>
                      <Loader2 size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} className="animate-spin" />
                      載入服務中…
                    </div>
                  )}
                  {categories.map(cat => (
                    <button key={cat} onClick={() => selectCategory(cat)} style={{
                      padding: '14px 16px', borderRadius: 12, border: `2px solid ${form.category === cat ? 'var(--t-accent)' : 'var(--t-border)'}`,
                      background: form.category === cat ? 'var(--t-accent-bg)' : 'transparent',
                      color: form.category === cat ? 'var(--t-accent)' : 'var(--t-text)', fontWeight: 600, fontSize: 15, textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                      {cat}
                    </button>
                  ))}
                </div>

                {form.category && (
                  <>
                    <SectionTitle icon={<Check size={16} />} title="選擇項目" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(services[form.category] ?? []).map(svc => (
                        <button key={svc.id} onClick={() => selectService(svc.id)} style={{
                          padding: '14px 16px', borderRadius: 12, border: `2px solid ${form.serviceId === svc.id ? 'var(--t-accent)' : 'var(--t-border)'}`,
                          background: form.serviceId === svc.id ? 'var(--t-accent-bg)' : 'transparent',
                          textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: form.serviceId === svc.id ? 'var(--t-accent)' : 'var(--t-text)', fontWeight: 600, fontSize: 15 }}>{svc.name}</span>
                            <span style={{ color: 'var(--t-accent)', fontWeight: 700, fontSize: 15 }}>NT$ {svc.price.toLocaleString()}</span>
                          </div>
                          <div style={{ color: 'var(--t-text-3)', fontSize: 13, marginTop: 4 }}>{svc.durationMin} 分鐘</div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── Step 1: Date & time ── */}
            {step === 1 && (
              <div>
                <SectionTitle icon={<Calendar size={16} />} title="選擇日期" />
                <input
                  type="date"
                  min={tomorrow()}
                  max={maxDate()}
                  value={form.date}
                  onChange={e => { if (!isWeekend(e.target.value)) selectDate(e.target.value) }}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 12, border: '2px solid var(--t-border)',
                    background: 'var(--t-bg)', color: 'var(--t-text)', fontSize: 15, marginBottom: 20, boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
                {form.date && isWeekend(form.date) && (
                  <p style={{ color: 'var(--t-warning)', fontSize: 13, marginTop: -16, marginBottom: 16 }}>⚠️ 週日公休，請選擇其他日期</p>
                )}

                {form.date && !isWeekend(form.date) && (
                  <>
                    <SectionTitle icon={<Clock size={16} />} title={`${formatDate(form.date)} 可預約時段`} />
                    {slotsLoading ? (
                      <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--t-text-3)' }}>
                        <Loader2 size={20} style={{ margin: '0 auto 8px' }} className="animate-spin" />
                        查詢時段中…
                      </div>
                    ) : slots.length === 0 ? (
                      <p style={{ color: 'var(--t-text-3)', textAlign: 'center', padding: '20px 0', fontSize: 14 }}>
                        當天已無可預約時段，請選擇其他日期
                      </p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                        {slots.map(slot => (
                          <button key={slot} onClick={() => setField('time', slot)} style={{
                            padding: '12px 0', borderRadius: 10, border: `2px solid ${form.time === slot ? 'var(--t-accent)' : 'var(--t-border)'}`,
                            background: form.time === slot ? 'var(--t-accent)' : 'transparent',
                            color: form.time === slot ? 'white' : 'var(--t-text)', fontWeight: 600, fontSize: 15, cursor: 'pointer', transition: 'all 0.15s',
                          }}>
                            {slot}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── Step 2: Info ── */}
            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <SectionTitle icon={<User size={16} />} title="填寫聯絡資料" />
                <Field label="姓名 *" value={form.name} onChange={v => setField('name', v)} placeholder="請輸入您的姓名" />
                <Field label="手機號碼 *" value={form.phone} onChange={v => setField('phone', v)} placeholder="09xxxxxxxx" type="tel" />
                <Field label="電子信箱（選填）" value={form.email} onChange={v => setField('email', v)} placeholder="預約確認信將寄至此信箱" type="email" />
                <div>
                  <label style={{ display: 'block', color: 'var(--t-text-2)', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>備註（選填）</label>
                  <textarea
                    value={form.note}
                    onChange={e => setField('note', e.target.value)}
                    placeholder="身體狀況、過敏史、特殊需求等…"
                    rows={3}
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: 12, border: '2px solid var(--t-border)',
                      background: 'var(--t-bg)', color: 'var(--t-text)', fontSize: 15, resize: 'none', boxSizing: 'border-box', outline: 'none',
                    }}
                  />
                </div>
              </div>
            )}

            {/* ── Step 3: Confirm ── */}
            {step === 3 && (
              <div>
                <SectionTitle icon={<Check size={16} />} title="確認預約資料" />
                <div style={{ background: 'var(--t-elevated)', borderRadius: 14, padding: '4px 16px', marginBottom: 20 }}>
                  {[
                    ['服務', selectedService?.name],
                    ['費用', selectedService ? `NT$ ${selectedService.price.toLocaleString()}` : ''],
                    ['時長', selectedService ? `${selectedService.durationMin} 分鐘` : ''],
                    ['日期', formatDate(form.date)],
                    ['時間', form.time],
                    ['姓名', form.name],
                    ['電話', form.phone],
                    ['Email', form.email || '（未填寫）'],
                    form.note ? ['備註', form.note] : null,
                  ].filter(Boolean).map(([label, value]) => (
                    <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--t-border)' }}>
                      <span style={{ color: 'var(--t-text-3)', fontSize: 14, flexShrink: 0, marginRight: 12 }}>{label}</span>
                      <span style={{ color: 'var(--t-text)', fontWeight: 600, fontSize: 14, textAlign: 'right', wordBreak: 'break-all' }}>{value as string}</span>
                    </div>
                  ))}
                </div>

                {error && (
                  <p style={{ color: 'var(--t-danger)', background: 'var(--t-danger-bg)', borderRadius: 10, padding: '10px 14px', fontSize: 14, marginBottom: 16 }}>
                    {error}
                  </p>
                )}

                <button
                  onClick={submit}
                  disabled={submitting}
                  style={{
                    width: '100%', padding: '16px', borderRadius: 12, border: 'none',
                    background: submitting ? 'var(--t-border)' : 'var(--t-accent)', color: 'white', fontWeight: 700, fontSize: 16, cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.15s',
                  }}
                >
                  {submitting ? <><Loader2 size={18} className="animate-spin" /> 送出中…</> : '✅ 確認送出預約'}
                </button>
              </div>
            )}
          </div>

          {/* Navigation buttons */}
          <div style={{ padding: '0 20px 20px', display: 'flex', gap: 10 }}>
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} style={{
                flex: step < 3 ? undefined : 1, padding: '13px 18px', borderRadius: 12, border: '2px solid var(--t-border)',
                background: 'transparent', color: 'var(--t-text-2)', fontWeight: 600, fontSize: 15, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <ChevronLeft size={18} /> 上一步
              </button>
            )}
            {step < 3 && (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={(step === 0 && !step0Valid) || (step === 1 && !step1Valid) || (step === 2 && !step2Valid)}
                style={{
                  flex: 1, padding: '13px 0', borderRadius: 12, border: 'none',
                  background: ((step === 0 && !step0Valid) || (step === 1 && !step1Valid) || (step === 2 && !step2Valid)) ? 'var(--t-border)' : 'var(--t-accent)',
                  color: 'white', fontWeight: 700, fontSize: 15, cursor: ((step === 0 && !step0Valid) || (step === 1 && !step1Valid) || (step === 2 && !step2Valid)) ? 'not-allowed' : 'pointer', transition: 'background 0.15s',
                }}
              >
                下一步
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <div style={{ color: 'var(--t-accent)' }}>{icon}</div>
      <span style={{ color: 'var(--t-text)', fontWeight: 700, fontSize: 15 }}>{title}</span>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div>
      <label style={{ display: 'block', color: 'var(--t-text-2)', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '12px 14px', borderRadius: 12, border: '2px solid var(--t-border)',
          background: 'var(--t-bg)', color: 'var(--t-text)', fontSize: 15, boxSizing: 'border-box', outline: 'none',
        }}
      />
    </div>
  )
}
