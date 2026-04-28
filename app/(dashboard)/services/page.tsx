'use client'

import { useEffect, useState, useMemo } from 'react'
import { Plus, Clock } from 'lucide-react'

type Service = { id: string; name: string; price: number; durationMin: number; category: string }
const CATEGORIES = ['身體按摩', '臉部護理', '特別療癒套組'] as const
const EMPTY = { name: '', price: '', durationMin: '', category: CATEGORIES[0] }

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [editing, setEditing] = useState<Service | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [filterCat, setFilterCat] = useState<'全部' | typeof CATEGORIES[number]>('全部')

  async function load() {
    const res = await fetch('/api/services')
    if (res.ok) setServices(await res.json())
  }
  useEffect(() => { load() }, [])

  const filtered = filterCat === '全部' ? services : services.filter(s => s.category === filterCat)
  const grouped = useMemo(() => {
    const map: Record<string, Service[]> = {}
    CATEGORIES.forEach(cat => { map[cat] = [] })
    filtered.forEach(s => { (map[s.category] ??= []).push(s) })
    return map
  }, [filtered])

  function openAdd() { setForm(EMPTY); setAdding(true) }
  function openEdit(s: Service) {
    setForm({ name: s.name, price: String(s.price), durationMin: String(s.durationMin), category: s.category })
    setEditing(s)
  }

  async function handleSave() {
    setSaving(true)
    const body = { ...form, price: Number(form.price), durationMin: Number(form.durationMin) }
    if (editing) {
      await fetch(`/api/services/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      setEditing(null)
    } else {
      await fetch('/api/services', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      setAdding(false)
    }
    setSaving(false); load()
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`確定要刪除「${name}」？`)) return
    await fetch(`/api/services/${id}`, { method: 'DELETE' }); load()
  }

  const showModal = adding || !!editing

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <header className="h-14 border-b border-[var(--t-border)] bg-[var(--t-surface)] flex items-center justify-between px-8 shrink-0">
        <p className="text-[10px] tracking-[0.35em] text-[var(--t-text-3)] uppercase">服務項目</p>
        <button onClick={openAdd}
          className="flex items-center gap-2 border border-[var(--t-accent)] text-[var(--t-accent)] hover:bg-[var(--t-accent)] hover:text-[var(--t-accent-fg)] px-5 py-1.5 text-[10px] tracking-[0.2em] uppercase transition-all duration-200">
          <Plus size={11} />
          新增服務
        </button>
      </header>

      <main className="flex-1 bg-[var(--t-bg)] p-8 overflow-auto">
        {/* Category tabs */}
        <div className="flex items-center gap-6 mb-8 border-b border-[var(--t-border)] pb-0">
          {(['全部', ...CATEGORIES] as const).map(cat => (
            <button key={cat} onClick={() => setFilterCat(cat)}
              className={`pb-3 text-[10px] tracking-[0.25em] border-b-[1.5px] -mb-px transition-colors ${
                filterCat === cat
                  ? 'border-[var(--t-accent)] text-[var(--t-accent)]'
                  : 'border-transparent text-[var(--t-text-3)] hover:text-[var(--t-text-2)]'
              }`}>
              {cat}
            </button>
          ))}
        </div>

        {services.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-xs text-[var(--t-text-3)] tracking-widest mb-2">尚無服務項目</p>
            <p className="text-[10px] text-[var(--t-text-4)] tracking-wide">點擊「新增服務」開始建立</p>
          </div>
        ) : (
          <div className="space-y-8">
            {(filterCat === '全部' ? CATEGORIES : [filterCat]).map(cat => { const items = grouped[cat] ?? []; return (
              <div key={cat}>
                <div className="flex items-center gap-4 mb-4">
                  <p className="text-[10px] tracking-[0.3em] text-[var(--t-accent)]">{cat}</p>
                  <div className="flex-1 h-px bg-[var(--t-border)]" />
                  <p className="text-[10px] text-[var(--t-text-4)] tracking-wide">{items.length} 項</p>
                </div>
                <div className="bg-[var(--t-surface)] border border-[var(--t-border)]">
                  <table className="w-full table-fixed">
                    <colgroup>
                      <col className="w-auto" />
                      <col style={{width:'120px'}} />
                      <col style={{width:'140px'}} />
                      <col style={{width:'96px'}} />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-[var(--t-border)]">
                        {['服務名稱', '時長', '定價', ''].map((h, i) => (
                          <th key={i} className={`text-[10px] font-normal text-[var(--t-text-4)] tracking-[0.25em] uppercase py-3 ${i === 0 ? 'text-left px-7' : 'text-right px-7'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 ? (
                        <tr><td colSpan={4} className="px-7 py-6 text-[10px] text-[var(--t-text-4)] tracking-wide">尚無項目</td></tr>
                      ) : items.map((s) => (
                        <tr key={s.id} className="border-b border-[var(--t-border)] last:border-0 hover:bg-[var(--t-bg)] transition-colors group">
                          <td className="px-7 py-4 text-sm font-light text-[var(--t-text)] tracking-wide">{s.name}</td>
                          <td className="px-7 py-4 text-right">
                            <span className="flex items-center justify-end gap-1.5 text-xs text-[var(--t-text-3)]">
                              <Clock size={11} strokeWidth={1.5} />
                              {s.durationMin} 分
                            </span>
                          </td>
                          <td className="px-7 py-4 text-right text-sm font-light text-[var(--t-text)] tabular-nums">
                            NT$ {s.price.toLocaleString()}
                          </td>
                          <td className="px-7 py-4 text-right">
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-4">
                              <button onClick={() => openEdit(s)} className="text-[10px] tracking-wide text-[var(--t-text-3)] hover:text-[var(--t-accent)] transition-colors">編輯</button>
                              <button onClick={() => handleDelete(s.id, s.name)} className="text-[10px] tracking-wide text-[var(--t-text-3)] hover:text-[#A05050] transition-colors">刪除</button>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )})}
          </div>
        )}
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--t-surface)] border border-[var(--t-border)] w-full max-w-sm p-8">
            <div className="flex items-center justify-between mb-8">
              <p className="text-[10px] tracking-[0.3em] text-[var(--t-text-2)] uppercase">{editing ? '編輯服務' : '新增服務'}</p>
              <button onClick={() => { setAdding(false); setEditing(null) }} className="text-[var(--t-text-4)] hover:text-[var(--t-text-2)] text-lg leading-none transition-colors">×</button>
            </div>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] text-[var(--t-text-3)] tracking-[0.25em] uppercase mb-2 block">服務名稱</label>
                <input type="text" placeholder="例：深層修復" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-transparent border-b border-[var(--t-border-s)] focus:border-[var(--t-accent)] focus:outline-none py-2 text-sm text-[var(--t-text)] placeholder:text-[var(--t-text-4)] transition-colors" />
              </div>
              <div>
                <label className="text-[10px] text-[var(--t-text-3)] tracking-[0.25em] uppercase mb-2 block">類別</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-transparent border-b border-[var(--t-border-s)] focus:border-[var(--t-accent)] focus:outline-none py-2 text-sm text-[var(--t-text)] transition-colors appearance-none cursor-pointer">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {([
                { label: '時長（分鐘）', key: 'durationMin' as const, placeholder: '60' },
                { label: '定價（NT$）',  key: 'price'       as const, placeholder: '1800' },
              ]).map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="text-[10px] text-[var(--t-text-3)] tracking-[0.25em] uppercase mb-2 block">{label}</label>
                  <input type="number" placeholder={placeholder} value={form[key]}
                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                    className="w-full bg-transparent border-b border-[var(--t-border-s)] focus:border-[var(--t-accent)] focus:outline-none py-2 text-sm text-[var(--t-text)] placeholder:text-[var(--t-text-4)] transition-colors" />
                </div>
              ))}
            </div>
            <button onClick={handleSave} disabled={saving}
              className="w-full mt-8 border border-[var(--t-accent)] text-[var(--t-accent)] hover:bg-[var(--t-accent)] hover:text-[var(--t-accent-fg)] disabled:opacity-40 py-2.5 text-[10px] tracking-[0.25em] uppercase transition-all duration-200">
              {saving ? '儲存中' : editing ? '儲存變更' : '建立服務'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
