'use client'

import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { serviceDescription } from '@/lib/booking-content'
import { PageHeader, FilterChip, Modal, FormField, EmptyState, btnPrimary, btnText, inputCls } from '@/components/ui/kit'

type Service = { id: string; name: string; price: number; durationMin: number; category: string }
const CATEGORIES = ['身體按摩', '臉部護理', '特別療癒套組'] as const
const EMPTY = { name: '', price: '', durationMin: '', category: CATEGORIES[0] as string }

export default function ServicesClient({ initialServices }: { initialServices: Service[] }) {
  const [services, setServices] = useState<Service[]>(initialServices)
  const [editing, setEditing] = useState<Service | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [filterCat, setFilterCat] = useState<'全部' | typeof CATEGORIES[number]>('全部')

  async function load() {
    const res = await fetch('/api/services')
    if (res.ok) setServices(await res.json())
  }

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

  // 分類以固定清單為主，再補上資料裡出現、但清單沒有的分類，避免舊資料被藏起來
  const allCats = [...new Set<string>([...CATEGORIES, ...services.map(s => s.category)])]
  const shownCats = filterCat === '全部' ? allCats : [filterCat]

  return (
    <div className="flex flex-1 flex-col overflow-hidden" style={{ background: 'var(--t-bg)' }}>
      <PageHeader title="服務項目" meta={`共 ${services.length} 項`}>
        <button onClick={openAdd} className={btnPrimary}><Plus size={16} strokeWidth={1.8} />新增服務</button>
      </PageHeader>

      <div className="shrink-0 px-4 pt-2 lg:px-5">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
          {(['全部', ...CATEGORIES] as const).map(cat => (
            <FilterChip key={cat} active={filterCat === cat} onClick={() => setFilterCat(cat)}>
              {cat}{cat !== '全部' && `　${services.filter(s => s.category === cat).length}`}
            </FilterChip>
          ))}
        </div>
      </div>

      <main className="flex-1 overflow-auto px-4 pb-4 pt-3 lg:px-5 lg:pb-5">
        {services.length === 0 ? (
          <div className="rounded-2xl bg-surface"><EmptyState title="還沒有服務項目" hint="按「新增服務」建立第一項。" /></div>
        ) : (
          <div className="flex flex-col gap-5">
            {shownCats.map(cat => {
              const items = grouped[cat] ?? []
              if (items.length === 0 && filterCat === '全部') return null
              return (
                <section key={cat} className="flex flex-col gap-3">
                  <div className="flex items-baseline gap-2.5 px-1">
                    <h2 className="text-[17px] text-ink">{cat}</h2>
                    <span className="text-xs text-ink-muted">{items.length} 項</span>
                  </div>
                  {items.length === 0 ? (
                    <p className="rounded-2xl bg-surface px-5 py-6 text-[13px] text-ink-muted">這個分類還沒有項目。</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {items.map(s => (
                        <div key={s.id} className="flex flex-col gap-3 rounded-2xl bg-surface px-5 pb-2 pt-[18px]">
                          <span className="font-heading text-[17px] font-semibold text-ink">{s.name}</span>
                          <span className="-mt-1.5 text-[13px] leading-relaxed text-ink-soft">{serviceDescription(s.name) ?? '尚無說明（說明文字在 lib/booking-content.ts）'}</span>
                          <div className="flex items-baseline gap-2.5">
                            <span className="num text-2xl font-semibold leading-none text-ink">NT$ {s.price.toLocaleString()}</span>
                            <span className="text-[13px] text-ink-muted">{s.durationMin} 分鐘</span>
                          </div>
                          <div className="flex justify-end gap-3 border-t border-line-soft">
                            <button onClick={() => openEdit(s)} className={btnText}>編輯</button>
                            <button onClick={() => handleDelete(s.id, s.name)} className={`${btnText} hover:text-visit-red`}>刪除</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        )}
      </main>

      {showModal && (
        <Modal title={editing ? '編輯服務' : '新增服務'} onClose={() => { setAdding(false); setEditing(null) }}
          footer={
            <button onClick={handleSave} disabled={saving} className={`${btnPrimary} h-[50px] flex-1`}>
              {saving ? '儲存中' : editing ? '儲存變更' : '建立服務'}
            </button>
          }>
          <FormField label="服務名稱" htmlFor="svc-name">
            <input id="svc-name" type="text" placeholder="例：深層保濕護理" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} />
          </FormField>
          <FormField label="類別" htmlFor="svc-cat">
            <select id="svc-cat" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
              className={`${inputCls} cursor-pointer`}>
              {allCats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="時長（分鐘）" htmlFor="svc-dur">
              <input id="svc-dur" type="number" inputMode="numeric" placeholder="60" value={form.durationMin}
                onChange={e => setForm({ ...form, durationMin: e.target.value })} className={inputCls} />
            </FormField>
            <FormField label="定價（NT$）" htmlFor="svc-price">
              <input id="svc-price" type="number" inputMode="numeric" placeholder="1800" value={form.price}
                onChange={e => setForm({ ...form, price: e.target.value })} className={inputCls} />
            </FormField>
          </div>
        </Modal>
      )}
    </div>
  )
}
