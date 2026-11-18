'use client'

import { useEffect, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import {
  PageHeader, FilterChip, Tag, SearchInput, Modal, FormField, EmptyState,
  btnPrimary, btnSecondary, btnOutline, btnDanger, btnText, inputCls,
} from '@/components/ui/kit'

type Item = { id: string; name: string; brand: string | null; category: string; quantity: number; alertLevel: number; unit: string; note: string | null }
type Entry = { id: string; itemId: string; itemName: string; unit: string; expected: number; actual: number }
type Session = { id: string; createdAt: string; completedAt: string | null; note: string | null; entries: Entry[] }

const CATEGORIES = ['保養品', '精油', '耗材', '其他'] as const
const EMPTY = { name: '', brand: '', category: CATEGORIES[0] as string, quantity: '', alertLevel: '', unit: '', note: '' }
const LIST_COLS = 'lg:grid-cols-[1.5fr_0.7fr_1.3fr_0.8fr_0.7fr_auto]'

function fmtDate(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loaded, setLoaded] = useState(false)
  const [filterCat, setFilterCat] = useState<string>('全部')
  const [lowOnly, setLowOnly] = useState(false)
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<Item | null>(null)
  const [adding, setAdding] = useState(false)
  const [adjusting, setAdjusting] = useState<Item | null>(null)
  const [adjustDelta, setAdjustDelta] = useState('')
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  // 盤點
  const [checking, setChecking] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [actuals, setActuals] = useState<Record<string, string>>({})
  const [sessions, setSessions] = useState<Session[]>([])
  const [openSession, setOpenSession] = useState<string | null>(null)

  async function load() {
    const res = await fetch('/api/inventory')
    if (res.ok) setItems(await res.json())
    setLoaded(true)
  }
  async function loadHistory() {
    const res = await fetch('/api/inventory/stockcheck')
    if (res.ok) setSessions(await res.json())
  }
  useEffect(() => { load(); loadHistory() }, [])

  const isLow = (i: Item) => i.quantity <= i.alertLevel
  const lowCount = items.filter(isLow).length
  const allCats = [...new Set<string>([...CATEGORIES, ...items.map(i => i.category)])]
  const keyword = q.trim().toLowerCase()
  const visible = items
    .filter(i => filterCat === '全部' || i.category === filterCat)
    .filter(i => !lowOnly || isLow(i))
    .filter(i => !keyword || i.name.toLowerCase().includes(keyword) || (i.brand ?? '').toLowerCase().includes(keyword))
    // 低庫存排前面，其餘依名稱
    .sort((a, b) => Number(isLow(b)) - Number(isLow(a)) || a.name.localeCompare(b.name, 'zh-Hant'))

  function openAdd() { setForm(EMPTY); setAdding(true) }
  function openEdit(item: Item) {
    setForm({ name: item.name, brand: item.brand ?? '', category: item.category, quantity: String(item.quantity), alertLevel: String(item.alertLevel), unit: item.unit, note: item.note ?? '' })
    setEditing(item)
  }

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

  async function adjust(item: Item, delta: number) {
    if (!delta) return
    setBusyId(item.id)
    // 先更新畫面，請求失敗再重新載入
    setItems(prev => prev.map(i => (i.id === item.id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i)))
    const res = await fetch(`/api/inventory/${item.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adjust: delta }),
    })
    if (!res.ok) load()
    setBusyId(null)
  }

  async function handleAdjust(dir: 1 | -1) {
    if (!adjusting || !adjustDelta) return
    setSaving(true)
    await adjust(adjusting, dir * Number(adjustDelta))
    setSaving(false); setAdjusting(null)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`確定要刪除「${name}」？`)) return
    await fetch(`/api/inventory/${id}`, { method: 'DELETE' })
    setEditing(null); load()
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

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden" style={{ background: 'var(--t-bg)' }}>
      <PageHeader title="庫存" meta={`${items.length} 個品項${lowCount ? `，${lowCount} 項低庫存` : ''}`}>
        <SearchInput value={q} onChange={setQ} placeholder="搜尋品項或品牌" className="hidden w-[240px] lg:flex" />
        <button onClick={startStockcheck} disabled={saving || items.length === 0} className={btnSecondary}>開始盤點</button>
        <button onClick={openAdd} className={btnPrimary}><Plus size={16} strokeWidth={1.8} />新增品項</button>
      </PageHeader>

      <div className="flex shrink-0 flex-col gap-2.5 px-4 pt-2 lg:px-5">
        <SearchInput value={q} onChange={setQ} placeholder="搜尋品項或品牌" className="lg:hidden" />
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
          {(['全部', ...allCats]).map(cat => (
            <FilterChip key={cat} active={filterCat === cat} onClick={() => setFilterCat(cat)}>
              {cat}{cat !== '全部' && `　${items.filter(i => i.category === cat).length}`}
            </FilterChip>
          ))}
          <FilterChip active={lowOnly} onClick={() => setLowOnly(v => !v)}>低庫存　{lowCount}</FilterChip>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 overflow-auto px-4 pb-4 pt-3 lg:flex-row lg:items-start lg:overflow-hidden lg:px-5 lg:pb-5">
        {/* ── 品項清單 ── */}
        <section className="flex min-w-0 flex-col rounded-2xl bg-surface lg:max-h-full lg:flex-[2.4] lg:overflow-hidden">
          {!loaded ? (
            <p className="px-6 py-10 text-center text-[13px] text-ink-muted">載入中…</p>
          ) : visible.length === 0 ? (
            <EmptyState title={items.length === 0 ? '還沒有庫存品項' : '沒有符合條件的品項'}
              hint={items.length === 0 ? '按「新增品項」建立第一項。' : '換個篩選條件試試。'} />
          ) : (
            <div className="overflow-auto px-2 pb-2 pt-4">
              <div className={`hidden gap-3 px-3.5 pb-2 text-xs text-ink-muted lg:grid ${LIST_COLS}`}>
                <span>品項</span><span>分類</span><span>剩餘數量</span><span>安全庫存</span><span>狀態</span><span className="w-12" />
              </div>
              {visible.map(item => {
                const low = isLow(item)
                return (
                  <div key={item.id}
                    className={`grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 border-t border-line-soft px-3.5 py-2.5 first-of-type:border-t-0 lg:min-h-[60px] lg:border-t ${LIST_COLS}`}>
                    <button onClick={() => openEdit(item)} className="flex min-w-0 flex-col items-start gap-0.5 text-left">
                      <span className="truncate text-[15px] font-medium text-ink lg:text-sm">{item.name}</span>
                      <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                        {[item.brand, item.note].filter(Boolean).join('・') || <span className="lg:hidden">{item.category}</span>}
                        {low && <span className="lg:hidden"><Tag kind="warn">低庫存</Tag></span>}
                      </span>
                    </button>
                    <span className="hidden text-sm text-ink-soft lg:block">{item.category}</span>
                    <Stepper item={item} busy={busyId === item.id} onAdjust={d => adjust(item, d)} onOpen={() => { setAdjustDelta(''); setAdjusting(item) }} />
                    <span className="hidden text-sm text-ink-soft lg:block">{item.alertLevel} {item.unit}</span>
                    <span className="hidden lg:block">{low ? <Tag kind="warn">低庫存</Tag> : <Tag kind="sage">充足</Tag>}</span>
                    <button onClick={() => openEdit(item)} className={`${btnText} hidden lg:inline-flex`}>編輯</button>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── 盤點紀錄 ── */}
        <section className="flex min-w-0 flex-col rounded-2xl bg-surface p-5 lg:max-h-full lg:flex-1 lg:overflow-hidden lg:p-[22px]">
          <h2 className="pb-1 text-[19px] text-ink">盤點紀錄</h2>
          {sessions.length === 0 ? (
            <p className="py-3 text-[13px] text-ink-muted">還沒有盤點過。按「開始盤點」，依序填入實際數量即可。</p>
          ) : (
            <div className="-mx-1 overflow-auto px-1">
              {sessions.map(s => {
                const diffs = s.entries.filter(e => e.actual !== e.expected)
                const open = openSession === s.id
                return (
                  <div key={s.id} className="border-b border-line-soft last:border-0">
                    <button onClick={() => setOpenSession(open ? null : s.id)} aria-expanded={open}
                      className="flex min-h-14 w-full items-center justify-between gap-2 py-2 text-left">
                      <span className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium text-ink">{fmtDate(s.createdAt)} 盤點</span>
                        <span className="text-xs text-ink-muted">
                          {s.entries.length} 個品項，{diffs.length ? `調整 ${diffs.length} 項` : '無調整'}{s.note ? `・${s.note}` : ''}
                        </span>
                      </span>
                      {diffs.length > 0 && <span className="text-xs text-ink-muted">{open ? '收合' : '明細'}</span>}
                    </button>
                    {open && diffs.length > 0 && (
                      <div className="flex flex-col gap-1.5 pb-3">
                        {diffs.map(e => {
                          const d = e.actual - e.expected
                          return (
                            <div key={e.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface-muted px-3 py-2 text-[13px]">
                              <span className="min-w-0 truncate text-ink">{e.itemName}</span>
                              <span className="shrink-0 text-ink-soft">
                                {e.expected} → {e.actual} {e.unit}
                                <span className={`ml-2 font-bold ${d > 0 ? 'text-visit-green-ink' : 'text-visit-red-ink'}`}>{d > 0 ? '+' : ''}{d}</span>
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {/* ── 盤點畫面 ── */}
      {checking && session && (
        <div className="absolute inset-0 z-40 flex flex-col" style={{ background: 'var(--t-bg)' }}>
          <PageHeader title="庫存盤點" meta="依序填入實際清點的數量，差異會即時顯示">
            <button onClick={() => setChecking(false)} className={btnSecondary}>取消</button>
            <button onClick={confirmStockcheck} disabled={saving} className={btnPrimary}>{saving ? '儲存中' : '確認盤點'}</button>
          </PageHeader>
          <div className="flex-1 overflow-auto px-4 pb-4 pt-3 lg:px-5 lg:pb-5">
            <div className="rounded-2xl bg-surface px-2 py-2">
              {session.entries.map(entry => {
                const actual = Number(actuals[entry.id] ?? entry.expected)
                const diff = actual - entry.expected
                return (
                  <div key={entry.id} className="flex min-h-16 items-center gap-3 border-b border-line-soft px-3.5 py-2 last:border-0">
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-[15px] text-ink">{entry.itemName}</span>
                      <span className="text-xs text-ink-muted">系統 {entry.expected} {entry.unit}</span>
                    </span>
                    <span className={`w-12 text-right text-sm font-bold ${diff === 0 ? 'text-ink-faint' : diff > 0 ? 'text-visit-green-ink' : 'text-visit-red-ink'}`}>
                      {diff === 0 ? '—' : `${diff > 0 ? '+' : ''}${diff}`}
                    </span>
                    <input type="number" inputMode="numeric" aria-label={`${entry.itemName} 實際數量`}
                      value={actuals[entry.id] ?? String(entry.expected)}
                      onChange={e => setActuals(prev => ({ ...prev, [entry.id]: e.target.value }))}
                      className={`${inputCls} num w-24 text-center text-lg`} />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── 新增／編輯 ── */}
      {showModal && (
        <Modal title={editing ? '編輯品項' : '新增品項'} onClose={() => { setAdding(false); setEditing(null) }}
          footer={<>
            {editing && <button onClick={() => handleDelete(editing.id, editing.name)} className={btnDanger}>刪除</button>}
            <button onClick={handleSave} disabled={saving || !form.name.trim()} className={`${btnPrimary} h-[50px] flex-1`}>
              {saving ? '儲存中' : editing ? '儲存變更' : '建立品項'}
            </button>
          </>}>
          <FormField label="品項名稱" htmlFor="inv-name">
            <input id="inv-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="例：保濕精華液" className={inputCls} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="品牌（選填）" htmlFor="inv-brand">
              <input id="inv-brand" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} className={inputCls} />
            </FormField>
            <FormField label="分類" htmlFor="inv-cat">
              <select id="inv-cat" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={`${inputCls} cursor-pointer`}>
                {allCats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </FormField>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="單位" htmlFor="inv-unit">
              <input id="inv-unit" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="瓶" className={inputCls} />
            </FormField>
            <FormField label="目前數量" htmlFor="inv-qty">
              <input id="inv-qty" type="number" inputMode="numeric" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="0" className={inputCls} />
            </FormField>
            <FormField label="安全庫存" htmlFor="inv-alert">
              <input id="inv-alert" type="number" inputMode="numeric" value={form.alertLevel} onChange={e => setForm({ ...form, alertLevel: e.target.value })} placeholder="3" className={inputCls} />
            </FormField>
          </div>
          <p className="-mt-2 text-xs text-ink-muted">數量低於或等於安全庫存時，會標示「低庫存」並出現在總覽。</p>
          <FormField label="備註（選填）" htmlFor="inv-note">
            <input id="inv-note" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} className={inputCls} />
          </FormField>
        </Modal>
      )}

      {/* ── 一次調整多個 ── */}
      {adjusting && (
        <Modal title="調整數量" onClose={() => setAdjusting(null)}
          footer={<>
            <button onClick={() => handleAdjust(-1)} disabled={saving || !adjustDelta} className={`${btnOutline} h-[50px] flex-1`}>用掉 −</button>
            <button onClick={() => handleAdjust(1)} disabled={saving || !adjustDelta} className={`${btnPrimary} h-[50px] flex-1`}>進貨 ＋</button>
          </>}>
          <p className="text-sm text-ink">
            <span className="font-heading text-[17px] font-semibold">{adjusting.name}</span>
            <span className="ml-2 text-ink-muted">目前 {adjusting.quantity} {adjusting.unit}</span>
          </p>
          <FormField label="數量" htmlFor="inv-delta">
            <input id="inv-delta" type="number" inputMode="numeric" min={1} value={adjustDelta} onChange={e => setAdjustDelta(e.target.value)}
              placeholder="輸入數量" className={inputCls} autoFocus />
          </FormField>
        </Modal>
      )}
    </div>
  )
}

/** 數量加減：點數字可一次輸入多個 */
function Stepper({ item, busy, onAdjust, onOpen }: { item: Item; busy: boolean; onAdjust: (d: number) => void; onOpen: () => void }) {
  const btn = 'flex size-11 shrink-0 items-center justify-center rounded-full border border-border-input text-ink transition-colors hover:bg-surface-muted disabled:opacity-40'
  return (
    <span className="flex items-center gap-1.5">
      <button onClick={() => onAdjust(-1)} disabled={busy || item.quantity <= 0} aria-label={`${item.name} 減一`} className={btn}>
        <Minus size={16} strokeWidth={1.6} />
      </button>
      <button onClick={onOpen} aria-label={`${item.name} 調整數量`} className="min-w-[56px] rounded-lg px-1 py-1 text-center hover:bg-surface-muted">
        <span className="num text-[22px] font-semibold text-ink">{item.quantity}</span>
        <span className="ml-1 text-xs text-ink-muted">{item.unit}</span>
      </button>
      <button onClick={() => onAdjust(1)} disabled={busy} aria-label={`${item.name} 加一`} className={btn}>
        <Plus size={16} strokeWidth={1.6} />
      </button>
    </span>
  )
}
