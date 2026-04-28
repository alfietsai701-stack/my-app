'use client'

import { useEffect, useState, useMemo } from 'react'
import { Plus, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'

type Item = { id: string; name: string; brand: string | null; category: string; quantity: number; alertLevel: number; unit: string; note: string | null }
type Entry = { id: string; itemId: string; itemName: string; unit: string; expected: number; actual: number }
type Session = { id: string; createdAt: string; completedAt: string | null; note: string | null; entries: Entry[] }

const CATEGORIES = ['保養品', '精油', '耗材', '其他'] as const
const EMPTY = { name: '', brand: '', category: CATEGORIES[0] as string, quantity: '', alertLevel: '', unit: '', note: '' }

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([])
  const [filterCat, setFilterCat] = useState<string>('全部')
  const [editing, setEditing] = useState<Item | null>(null)
  const [adding, setAdding] = useState(false)
  const [adjusting, setAdjusting] = useState<Item | null>(null)
  const [adjustDelta, setAdjustDelta] = useState('')
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  // Stockcheck
  const [checking, setChecking] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [actuals, setActuals] = useState<Record<string, string>>({})
  const [sessions, setSessions] = useState<Session[]>([])
  const [showHistory, setShowHistory] = useState(false)

  async function load() {
    const res = await fetch('/api/inventory')
    if (res.ok) setItems(await res.json())
  }
  async function loadHistory() {
    const res = await fetch('/api/inventory/stockcheck')
    if (res.ok) setSessions(await res.json())
  }
  useEffect(() => { load(); loadHistory() }, [])

  const lowCount = items.filter(i => i.quantity <= i.alertLevel).length
  const filtered = filterCat === '全部' ? items : items.filter(i => i.category === filterCat)
  const grouped = useMemo(() => {
    const map: Record<string, Item[]> = {}
    CATEGORIES.forEach(c => { map[c] = [] })
    filtered.forEach(i => { (map[i.category] ??= []).push(i) })
    return map
  }, [filtered])

  function openAdd() { setForm(EMPTY); setAdding(true) }
  function openEdit(item: Item) {
    setForm({ name: item.name, brand: item.brand ?? '', category: item.category, quantity: String(item.quantity), alertLevel: String(item.alertLevel), unit: item.unit, note: item.note ?? '' })
    setEditing(item)
  }
  function openAdjust(item: Item) { setAdjustDelta(''); setAdjusting(item) }

  async function handleSave() {
    setSaving(true)
    const body = { ...form, quantity: Number(form.quantity), alertLevel: Number(form.alertLevel) }
    if (editing) {
      await fetch(`/api/inventory/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      setEditing(null)
    } else {
      await fetch('/api/inventory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      setAdding(false)
    }
    setSaving(false); load()
  }

  async function handleAdjust(dir: 1 | -1) {
    if (!adjusting || !adjustDelta) return
    setSaving(true)
    await fetch(`/api/inventory/${adjusting.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adjust: dir * Number(adjustDelta) }),
    })
    setSaving(false); setAdjusting(null); load()
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`確定要刪除「${name}」？`)) return
    await fetch(`/api/inventory/${id}`, { method: 'DELETE' }); load()
  }

  async function startStockcheck() {
    setSaving(true)
    const res = await fetch('/api/inventory/stockcheck', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    if (res.ok) {
      const s: Session = await res.json()
      setSession(s)
      const init: Record<string, string> = {}
      s.entries.forEach(e => { init[e.id] = String(e.expected) })
      setActuals(init)
      setChecking(true)
    }
    setSaving(false)
  }

  async function confirmStockcheck() {
    if (!session) return
    setSaving(true)
    const entries = session.entries.map(e => ({ id: e.id, actual: Number(actuals[e.id] ?? e.expected) }))
    await fetch(`/api/inventory/stockcheck/${session.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries }),
    })
    setSaving(false); setChecking(false); setSession(null); load(); loadHistory()
  }

  const showModal = adding || !!editing
  const visibleCats = filterCat === '全部' ? [...CATEGORIES] : [filterCat]

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <header className="h-14 border-b border-[var(--t-border)] bg-[var(--t-surface)] flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-4">
          <p className="text-[10px] tracking-[0.35em] text-[var(--t-text-3)] uppercase">庫存管理</p>
          {lowCount > 0 && (
            <span className="flex items-center gap-1.5 text-[10px] text-[#A06060] tracking-wide">
              <AlertTriangle size={11} strokeWidth={1.5} />{lowCount} 項低庫存
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={startStockcheck} disabled={saving}
            className="border border-[var(--t-border-s)] text-[var(--t-text-3)] hover:border-[var(--t-accent)] hover:text-[var(--t-accent)] px-5 py-1.5 text-[10px] tracking-[0.2em] uppercase transition-all duration-200 disabled:opacity-40">
            開始盤點
          </button>
          <button onClick={openAdd}
            className="flex items-center gap-2 border border-[var(--t-accent)] text-[var(--t-accent)] hover:bg-[var(--t-accent)] hover:text-[var(--t-accent-fg)] px-5 py-1.5 text-[10px] tracking-[0.2em] uppercase transition-all duration-200">
            <Plus size={11} />新增品項
          </button>
        </div>
      </header>

      <main className="flex-1 bg-[var(--t-bg)] p-4 lg:p-8 overflow-auto">
        {/* Tabs */}
        <div className="flex items-center gap-6 mb-8 border-b border-[var(--t-border)] pb-0">
          {(['全部', ...CATEGORIES] as const).map(cat => (
            <button key={cat} onClick={() => setFilterCat(cat)}
              className={`pb-3 text-[10px] tracking-[0.25em] border-b-[1.5px] -mb-px transition-colors ${
                filterCat === cat ? 'border-[var(--t-accent)] text-[var(--t-accent)]' : 'border-transparent text-[var(--t-text-3)] hover:text-[var(--t-text-2)]'
              }`}>
              {cat}
            </button>
          ))}
        </div>

        <div className="space-y-6 lg:space-y-8">
          {visibleCats.map(cat => {
            const catItems = grouped[cat] ?? []
            return (
              <div key={cat}>
                <div className="flex items-center gap-4 mb-4">
                  <p className="text-[10px] tracking-[0.3em] text-[var(--t-accent)]">{cat}</p>
                  <div className="flex-1 h-px bg-[var(--t-border)]" />
                  <p className="text-[10px] text-[var(--t-text-4)] tracking-wide">{catItems.length} 項</p>
                </div>
                <div className="bg-[var(--t-surface)] border border-[var(--t-border)] overflow-x-auto">
                  <table className="w-full min-w-[480px] table-fixed">
                    <colgroup>
                      <col className="w-auto" /><col style={{ width: '80px' }} /><col style={{ width: '120px' }} /><col style={{ width: '100px' }} /><col style={{ width: '130px' }} />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-[var(--t-border)]">
                        {['品項名稱', '單位', '警示量', '庫存量', ''].map((h, i) => (
                          <th key={i} className={`text-[10px] font-normal text-[var(--t-text-4)] tracking-[0.25em] uppercase py-3 ${i === 0 ? 'text-left px-7' : 'text-right px-7'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {catItems.length === 0 ? (
                        <tr><td colSpan={5} className="px-7 py-6 text-[10px] text-[var(--t-text-4)] tracking-wide">尚無品項</td></tr>
                      ) : catItems.map(item => {
                        const low = item.quantity <= item.alertLevel
                        return (
                          <tr key={item.id} className="border-b border-[var(--t-border)] last:border-0 hover:bg-[var(--t-bg)] transition-colors group">
                            <td className="px-7 py-4">
                              <p className="text-sm font-light text-[var(--t-text)] tracking-wide">{item.name}</p>
                              <p className="text-[10px] text-[var(--t-text-4)] tracking-wide mt-0.5">
                                {[item.brand, item.note].filter(Boolean).join('　·　')}
                              </p>
                            </td>
                            <td className="px-7 py-4 text-right text-xs text-[var(--t-text-3)]">{item.unit}</td>
                            <td className="px-7 py-4 text-right text-xs text-[var(--t-text-3)] tabular-nums">{item.alertLevel}</td>
                            <td className="px-7 py-4 text-right tabular-nums">
                              <span className={`text-sm font-light ${low ? 'text-[#A06060]' : 'text-[var(--t-text)]'}`}>{item.quantity}</span>
                              {low && <AlertTriangle size={10} strokeWidth={1.5} className="inline ml-1.5 text-[#A06060]" />}
                            </td>
                            <td className="px-7 py-4 text-right">
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-4">
                                <button onClick={() => openAdjust(item)} className="text-[10px] tracking-wide text-[var(--t-text-3)] hover:text-[var(--t-accent)] transition-colors">調整</button>
                                <button onClick={() => openEdit(item)} className="text-[10px] tracking-wide text-[var(--t-text-3)] hover:text-[var(--t-accent)] transition-colors">編輯</button>
                                <button onClick={() => handleDelete(item.id, item.name)} className="text-[10px] tracking-wide text-[var(--t-text-3)] hover:text-[#A05050] transition-colors">刪除</button>
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>

        {/* History */}
        {sessions.length > 0 && (
          <div className="mt-12">
            <button onClick={() => setShowHistory(h => !h)}
              className="flex items-center gap-3 mb-4 text-[10px] tracking-[0.3em] text-[var(--t-text-3)] uppercase hover:text-[var(--t-text-2)] transition-colors">
              盤點紀錄
              {showHistory ? <ChevronUp size={11} strokeWidth={1.5} /> : <ChevronDown size={11} strokeWidth={1.5} />}
            </button>
            {showHistory && (
              <div className="bg-[var(--t-surface)] border border-[var(--t-border)]">
                {sessions.map((s, si) => (
                  <div key={s.id} className={si < sessions.length - 1 ? 'border-b border-[var(--t-border)]' : ''}>
                    <div className="px-7 py-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-light text-[var(--t-text)] tracking-wide">
                          {new Date(s.createdAt).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                        {s.note && <p className="text-[10px] text-[var(--t-text-4)] tracking-wide mt-0.5">{s.note}</p>}
                      </div>
                      <div className="flex items-center gap-6 text-right">
                        <div>
                          <p className="text-[10px] text-[var(--t-text-4)] tracking-wide mb-0.5">品項數</p>
                          <p className="text-xs text-[var(--t-text-3)]">{s.entries.length}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[var(--t-text-4)] tracking-wide mb-0.5">差異品項</p>
                          <p className={`text-xs ${s.entries.some(e => e.actual !== e.expected) ? 'text-[#A06060]' : 'text-[#6B9E78]'}`}>
                            {s.entries.filter(e => e.actual !== e.expected).length} 項
                          </p>
                        </div>
                      </div>
                    </div>
                    {s.entries.some(e => e.actual !== e.expected) && (
                      <div className="px-7 pb-4">
                        <table className="w-full">
                          <tbody>
                            {s.entries.filter(e => e.actual !== e.expected).map(e => (
                              <tr key={e.id}>
                                <td className="py-1 text-xs text-[var(--t-text-2)] tracking-wide">{e.itemName}</td>
                                <td className="py-1 text-right text-xs text-[var(--t-text-3)] tabular-nums">系統 {e.expected} → 實際 {e.actual} {e.unit}</td>
                                <td className="py-1 text-right text-xs tabular-nums w-16">
                                  <span className={e.actual - e.expected > 0 ? 'text-[#6B9E78]' : 'text-[#A06060]'}>
                                    {e.actual - e.expected > 0 ? '+' : ''}{e.actual - e.expected}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Stockcheck overlay */}
      {checking && session && (
        <div className="fixed inset-0 bg-[var(--t-bg)] z-50 flex flex-col">
          <div className="h-14 border-b border-[var(--t-border)] bg-[var(--t-surface)] flex items-center justify-between px-8 shrink-0">
            <div>
              <p className="text-[10px] tracking-[0.35em] text-[var(--t-text-3)] uppercase">庫存盤點</p>
              <p className="text-[10px] text-[var(--t-text-4)] tracking-wide mt-0.5">依序填入實際清點數量，差異欄位即時顯示</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setChecking(false)} className="border border-[var(--t-border-s)] text-[var(--t-text-3)] hover:text-[var(--t-text-2)] px-5 py-1.5 text-[10px] tracking-[0.2em] uppercase transition-all duration-200">取消</button>
              <button onClick={confirmStockcheck} disabled={saving}
                className="border border-[var(--t-accent)] text-[var(--t-accent)] hover:bg-[var(--t-accent)] hover:text-[var(--t-accent-fg)] disabled:opacity-40 px-5 py-1.5 text-[10px] tracking-[0.2em] uppercase transition-all duration-200">
                {saving ? '儲存中' : '確認盤點'}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-8">
            <div className="bg-[var(--t-surface)] border border-[var(--t-border)]">
              <table className="w-full table-fixed">
                <colgroup>
                  <col className="w-auto" />
                  <col style={{ width: '80px' }} />
                  <col style={{ width: '110px' }} />
                  <col style={{ width: '130px' }} />
                  <col style={{ width: '90px' }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-[var(--t-border)]">
                    {['品項名稱', '單位', '系統量', '實際清點', '差異'].map((h, i) => (
                      <th key={i} className={`text-[10px] font-normal text-[var(--t-text-4)] tracking-[0.25em] uppercase py-3 ${i === 0 ? 'text-left px-7' : 'text-right px-7'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {session.entries.map(entry => {
                    const actual = Number(actuals[entry.id] ?? entry.expected)
                    const diff = actual - entry.expected
                    return (
                      <tr key={entry.id} className="border-b border-[var(--t-border)] last:border-0">
                        <td className="px-7 py-3 text-sm font-light text-[var(--t-text)] tracking-wide">{entry.itemName}</td>
                        <td className="px-7 py-3 text-right text-xs text-[var(--t-text-3)]">{entry.unit}</td>
                        <td className="px-7 py-3 text-right text-sm text-[var(--t-text-3)] tabular-nums">{entry.expected}</td>
                        <td className="px-7 py-2 text-right">
                          <input
                            type="number"
                            value={actuals[entry.id] ?? String(entry.expected)}
                            onChange={e => setActuals(prev => ({ ...prev, [entry.id]: e.target.value }))}
                            className="w-20 bg-transparent border-b border-[var(--t-border-s)] focus:border-[var(--t-accent)] focus:outline-none py-1 text-sm text-[var(--t-text)] text-right tabular-nums transition-colors"
                          />
                        </td>
                        <td className="px-7 py-3 text-right text-sm tabular-nums">
                          {diff === 0
                            ? <span className="text-[var(--t-text-4)]">—</span>
                            : <span className={diff > 0 ? 'text-[#6B9E78]' : 'text-[#A06060]'}>{diff > 0 ? '+' : ''}{diff}</span>
                          }
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--t-surface)] border border-[var(--t-border)] w-full max-w-sm p-8">
            <div className="flex items-center justify-between mb-8">
              <p className="text-[10px] tracking-[0.3em] text-[var(--t-text-2)] uppercase">{editing ? '編輯品項' : '新增品項'}</p>
              <button onClick={() => { setAdding(false); setEditing(null) }} className="text-[var(--t-text-4)] hover:text-[var(--t-text-2)] text-lg leading-none transition-colors">×</button>
            </div>
            <div className="space-y-5">
              <Field label="品項名稱"><UInput value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="例：玻尿酸精華液" /></Field>
              <Field label="品牌"><UInput value={form.brand} onChange={v => setForm({ ...form, brand: v })} placeholder="例：La Mer" /></Field>
              <Field label="類別">
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-transparent border-b border-[var(--t-border-s)] focus:border-[var(--t-accent)] focus:outline-none py-2 text-sm text-[var(--t-text)] transition-colors appearance-none cursor-pointer">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="單位"><UInput value={form.unit} onChange={v => setForm({ ...form, unit: v })} placeholder="瓶 / 罐 / 個" /></Field>
                <Field label="庫存量"><UInput type="number" value={form.quantity} onChange={v => setForm({ ...form, quantity: v })} placeholder="0" /></Field>
              </div>
              <Field label="低庫存警示"><UInput type="number" value={form.alertLevel} onChange={v => setForm({ ...form, alertLevel: v })} placeholder="5" /></Field>
              <Field label="備註"><UInput value={form.note} onChange={v => setForm({ ...form, note: v })} placeholder="選填" /></Field>
            </div>
            <button onClick={handleSave} disabled={saving}
              className="w-full mt-8 border border-[var(--t-accent)] text-[var(--t-accent)] hover:bg-[var(--t-accent)] hover:text-[var(--t-accent-fg)] disabled:opacity-40 py-2.5 text-[10px] tracking-[0.25em] uppercase transition-all duration-200">
              {saving ? '儲存中' : editing ? '儲存變更' : '建立品項'}
            </button>
          </div>
        </div>
      )}

      {/* Adjust stock modal */}
      {adjusting && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--t-surface)] border border-[var(--t-border)] w-full max-w-xs p-8">
            <div className="flex items-center justify-between mb-6">
              <p className="text-[10px] tracking-[0.3em] text-[var(--t-text-2)] uppercase">調整庫存</p>
              <button onClick={() => setAdjusting(null)} className="text-[var(--t-text-4)] hover:text-[var(--t-text-2)] text-lg leading-none transition-colors">×</button>
            </div>
            <p className="text-sm font-light text-[var(--t-text)] mb-1">{adjusting.name}</p>
            <p className="text-[10px] text-[var(--t-text-4)] tracking-wide mb-6">目前庫存：{adjusting.quantity} {adjusting.unit}</p>
            <Field label="數量"><UInput type="number" value={adjustDelta} onChange={setAdjustDelta} placeholder="輸入數量" /></Field>
            <div className="grid grid-cols-2 gap-3 mt-8">
              <button onClick={() => handleAdjust(1)} disabled={saving || !adjustDelta}
                className="border border-[var(--t-accent)] text-[var(--t-accent)] hover:bg-[var(--t-accent)] hover:text-[var(--t-accent-fg)] disabled:opacity-40 py-2.5 text-[10px] tracking-[0.2em] uppercase transition-all duration-200">
                進貨 +
              </button>
              <button onClick={() => handleAdjust(-1)} disabled={saving || !adjustDelta}
                className="border border-[var(--t-border-s)] text-[var(--t-text-3)] hover:border-[#A06060] hover:text-[#A06060] disabled:opacity-40 py-2.5 text-[10px] tracking-[0.2em] uppercase transition-all duration-200">
                出貨 −
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] text-[var(--t-text-3)] tracking-[0.25em] uppercase mb-2 block">{label}</label>
      {children}
    </div>
  )
}

function UInput({ value, onChange, type = 'text', placeholder = '' }: { value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
      className="w-full bg-transparent border-b border-[var(--t-border-s)] focus:border-[var(--t-accent)] focus:outline-none py-2 text-sm text-[var(--t-text)] placeholder:text-[var(--t-text-4)] transition-colors" />
  )
}
