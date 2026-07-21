'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Plus, Search, X, ChevronRight } from 'lucide-react'
import { DEFAULT_CUSTOMER_TAGS } from '@/lib/customer-tags'

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
const statusStyle: Record<string, string> = {
  confirmed: 'text-[var(--t-accent)]',
  completed: 'text-[#6B9E78]',
  cancelled:  'text-[#A06060]',
}

function age(birthday: string) {
  const diff = Date.now() - new Date(birthday).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}

export default function CustomersClient({ initialCustomers }: { initialCustomers: Customer[] }) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers)
  const [q, setQ] = useState('')
  const [detail, setDetail] = useState<CustomerDetail | null>(null)
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [tagFilter, setTagFilter] = useState('')
  const [customTag, setCustomTag] = useState('')

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

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <header className="h-14 border-b border-[var(--t-border)] bg-[var(--t-surface)] flex items-center justify-between px-8 shrink-0">
        <p className="text-[10px] tracking-[0.35em] text-[var(--t-text-3)] uppercase">顧客管理</p>
        <button onClick={() => { setForm(EMPTY); setAdding(true) }}
          className="flex items-center gap-2 border border-[var(--t-accent)] text-[var(--t-accent)] hover:bg-[var(--t-accent)] hover:text-[var(--t-accent-fg)] px-5 py-1.5 text-[10px] tracking-[0.2em] uppercase transition-all duration-200">
          <Plus size={11} />新增顧客
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* List */}
        <div className={`flex flex-col border-r border-[var(--t-border)] transition-all ${detail ? 'hidden lg:flex lg:w-[55%]' : 'flex-1'}`}>
          {/* Search */}
          <div className="px-8 py-4 border-b border-[var(--t-border)] bg-[var(--t-surface)]">
            <div className="flex items-center gap-3 border-b border-[var(--t-border-s)] pb-2 focus-within:border-[var(--t-accent)] transition-colors">
              <Search size={12} strokeWidth={1.5} className="text-[var(--t-text-4)] shrink-0" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="搜尋姓名或電話"
                className="flex-1 bg-transparent text-sm text-[var(--t-text)] placeholder:text-[var(--t-text-4)] focus:outline-none" />
              {q && <button onClick={() => setQ('')}><X size={11} className="text-[var(--t-text-4)] hover:text-[var(--t-text-3)]" /></button>}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {DEFAULT_CUSTOMER_TAGS.map(t => (
                <button key={t} onClick={() => setTagFilter(f => (f === t ? '' : t))}
                  className={`px-2.5 py-0.5 text-[10px] tracking-wide border transition-colors ${tagFilter === t ? 'border-[var(--t-accent)] bg-[var(--t-accent)] text-[var(--t-accent-fg)]' : 'border-[var(--t-border-s)] text-[var(--t-text-3)] hover:border-[var(--t-accent)]'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-[var(--t-bg)]">
            {customers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <p className="text-xs text-[var(--t-text-3)] tracking-widest mb-2">尚無顧客資料</p>
                <p className="text-[10px] text-[var(--t-text-4)] tracking-wide">點擊「新增顧客」開始建立</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 bg-[var(--t-surface)] z-10">
                  <tr className="border-b border-[var(--t-border)]">
                    {['姓名', '電話', '年齡', '預約次數', ''].map((h, i) => (
                      <th key={i} className={`text-[10px] font-normal text-[var(--t-text-4)] tracking-[0.25em] uppercase py-3 ${i <= 1 ? 'text-left px-8' : i === 4 ? 'w-10 px-4' : 'text-right px-8'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-[var(--t-surface)]">
                  {customers.map(c => (
                    <tr key={c.id} onClick={() => openDetail(c.id)}
                      className={`border-b border-[var(--t-border)] last:border-0 cursor-pointer transition-colors ${detail?.id === c.id ? 'bg-[var(--t-bg)]' : 'hover:bg-[var(--t-bg)]'}`}>
                      <td className="px-8 py-4">
                        <span className="text-sm font-light text-[var(--t-text)] tracking-wide">{c.name}</span>
                        {c.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {c.tags.slice(0, 3).map(t => (
                              <span key={t} className="text-[9px] tracking-wide text-[var(--t-accent)] border border-[var(--t-accent-bg)] px-1.5 py-0.5">{t}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-4 text-xs text-[var(--t-text-3)] tabular-nums tracking-wide">{c.phone}</td>
                      <td className="px-8 py-4 text-right text-xs text-[var(--t-text-3)]">{c.birthday ? `${age(c.birthday)} 歲` : '—'}</td>
                      <td className="px-8 py-4 text-right text-xs text-[var(--t-text-3)] tabular-nums">{c._count.appointments}</td>
                      <td className="px-4 py-4 text-right"><ChevronRight size={12} strokeWidth={1.5} className="text-[var(--t-text-4)] ml-auto" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="px-8 py-3 border-t border-[var(--t-border)] bg-[var(--t-surface)]">
            <p className="text-[10px] text-[var(--t-text-4)] tracking-wide">{customers.length} 位顧客</p>
          </div>
        </div>

        {/* Detail panel */}
        {detail && (
          <div className="flex-1 flex flex-col overflow-hidden bg-[var(--t-bg)]">
            <div className="px-4 lg:px-8 py-4 lg:py-5 border-b border-[var(--t-border)] bg-[var(--t-surface)] flex items-start justify-between shrink-0">
              <div>
                <p className="text-base font-light text-[var(--t-text)] tracking-wide mb-1">{detail.name}</p>
                <p className="text-xs text-[var(--t-text-3)] tracking-wide">{detail.phone}</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => openEdit(detail)} className="text-[10px] tracking-wide text-[var(--t-text-3)] hover:text-[var(--t-accent)] transition-colors">編輯</button>
                <button onClick={() => handleDelete(detail.id, detail.name)} className="text-[10px] tracking-wide text-[var(--t-text-3)] hover:text-[#A05050] transition-colors">刪除</button>
                <button onClick={() => setDetail(null)} className="text-[var(--t-text-4)] hover:text-[var(--t-text-2)] text-lg leading-none transition-colors ml-2" aria-label="關閉">×</button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 lg:p-8 space-y-6">
              {/* Basic info */}
              <div className="bg-[var(--t-surface)] border border-[var(--t-border)] px-7 py-5">
                <div className="grid grid-cols-2 gap-y-4">
                  {[
                    ['生日', detail.birthday ? `${detail.birthday.slice(0, 10)}（${age(detail.birthday)} 歲）` : '—'],
                    ['加入日期', new Date(detail.createdAt).toLocaleDateString('zh-TW')],
                    ['備註', detail.note || '—'],
                    ['會員等級', detail.member ? { general: '一般', silver: '銀卡', gold: '金卡' }[detail.member.tier] ?? detail.member.tier : '非會員'],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-[10px] text-[var(--t-text-4)] tracking-[0.2em] uppercase mb-1">{label}</p>
                      <p className="text-xs text-[var(--t-text-2)] font-light">{value}</p>
                    </div>
                  ))}
                </div>
                {detail.tags?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[var(--t-border)]">
                    <p className="text-[10px] text-[var(--t-text-4)] tracking-[0.2em] uppercase mb-2">標籤</p>
                    <div className="flex flex-wrap gap-1.5">
                      {detail.tags.map(t => (
                        <span key={t} className="text-[10px] tracking-wide text-[var(--t-accent)] border border-[var(--t-accent-bg)] px-2 py-0.5">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Appointments */}
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <p className="text-[10px] tracking-[0.3em] text-[var(--t-accent)]">預約紀錄</p>
                  <div className="flex-1 h-px bg-[var(--t-border)]" />
                  <p className="text-[10px] text-[var(--t-text-4)]">{detail.appointments.length} 筆</p>
                </div>
                {detail.appointments.length === 0 ? (
                  <p className="text-[10px] text-[var(--t-text-4)] tracking-wide px-1">尚無預約紀錄</p>
                ) : (
                  <div className="bg-[var(--t-surface)] border border-[var(--t-border)]">
                    <table className="w-full table-fixed">
                      <colgroup><col /><col style={{width:'90px'}} /><col style={{width:'100px'}} /><col style={{width:'110px'}} /></colgroup>
                      <tbody>
                        {detail.appointments.map(a => (
                          <tr key={a.id} className="border-b border-[var(--t-border)] last:border-0">
                            <td className="px-7 py-3 text-xs font-light text-[var(--t-text)]">{a.service.name}</td>
                            <td className="px-7 py-3 text-right text-[10px] text-[var(--t-text-4)]">
                              {new Date(a.scheduledAt).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}
                            </td>
                            <td className={`px-7 py-3 text-right text-[10px] ${statusStyle[a.status] ?? 'text-[var(--t-text-3)]'}`}>
                              {statusLabel[a.status] ?? a.status}
                            </td>
                            <td className="px-7 py-3 text-right text-xs text-[var(--t-text)] tabular-nums">
                              {a.receipt ? `NT$ ${a.receipt.total.toLocaleString()}` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit modal */}
      {(adding || editing) && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--t-surface)] border border-[var(--t-border)] w-full max-w-sm p-8">
            <div className="flex items-center justify-between mb-8">
              <p className="text-[10px] tracking-[0.3em] text-[var(--t-text-2)] uppercase">{editing ? '編輯顧客' : '新增顧客'}</p>
              <button onClick={() => { setAdding(false); setEditing(false) }} className="text-[var(--t-text-4)] hover:text-[var(--t-text-2)] text-lg leading-none">×</button>
            </div>
            <div className="space-y-5">
              {([
                { label: '姓名', key: 'name' as const, placeholder: '王小明', type: 'text' },
                { label: '電話', key: 'phone' as const, placeholder: '0912-345-678', type: 'text' },
                { label: '生日', key: 'birthday' as const, placeholder: '1990-01-01', type: 'date' },
                { label: '備註', key: 'note' as const, placeholder: '選填', type: 'text' },
              ]).map(({ label, key, placeholder, type }) => (
                <div key={key}>
                  <label className="text-[10px] text-[var(--t-text-3)] tracking-[0.25em] uppercase mb-2 block">{label}</label>
                  <input type={type ?? 'text'} placeholder={placeholder} value={form[key]}
                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                    className="w-full bg-transparent border-b border-[var(--t-border-s)] focus:border-[var(--t-accent)] focus:outline-none py-2 text-sm text-[var(--t-text)] placeholder:text-[var(--t-text-4)] transition-colors" />
                </div>
              ))}
              <div>
                <label className="text-[10px] text-[var(--t-text-3)] tracking-[0.25em] uppercase mb-2 block">標籤</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {[...new Set<string>([...DEFAULT_CUSTOMER_TAGS, ...form.tags])].map(t => {
                    const on = form.tags.includes(t)
                    return (
                      <button key={t} type="button" onClick={() => toggleTag(t)}
                        className={`px-2.5 py-1 text-[11px] tracking-wide border transition-colors ${on ? 'border-[var(--t-accent)] bg-[var(--t-accent)] text-[var(--t-accent-fg)]' : 'border-[var(--t-border-s)] text-[var(--t-text-3)] hover:border-[var(--t-accent)]'}`}>
                        {t}
                      </button>
                    )
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <input value={customTag} onChange={e => setCustomTag(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag() } }}
                    placeholder="自訂標籤"
                    className="flex-1 bg-transparent border-b border-[var(--t-border-s)] focus:border-[var(--t-accent)] focus:outline-none py-1.5 text-sm text-[var(--t-text)] placeholder:text-[var(--t-text-4)] transition-colors" />
                  <button type="button" onClick={addCustomTag} disabled={!customTag.trim()}
                    className="text-[10px] tracking-[0.2em] uppercase text-[var(--t-text-3)] hover:text-[var(--t-accent)] disabled:opacity-40 transition-colors">＋ 新增</button>
                </div>
              </div>
            </div>
            <button onClick={handleSave} disabled={saving}
              className="w-full mt-8 border border-[var(--t-accent)] text-[var(--t-accent)] hover:bg-[var(--t-accent)] hover:text-[var(--t-accent-fg)] disabled:opacity-40 py-2.5 text-[10px] tracking-[0.25em] uppercase transition-all duration-200">
              {saving ? '儲存中' : editing ? '儲存變更' : '建立顧客'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
