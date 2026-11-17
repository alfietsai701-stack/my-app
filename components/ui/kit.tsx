import { Search, X } from 'lucide-react'
import { VISIT_LIGHT_LABEL, type VisitLight, type VisitLightLevel } from '@/lib/visit-lights'

// 後台各頁共用的小元件，樣式對應設計系統「Ada 慢療室」：
// 按鈕與標籤一律膠囊形、可點目標至少 44px、卡片 22px 圓角不加陰影。

const btnBase = 'inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-5 text-sm transition-colors disabled:opacity-50 disabled:pointer-events-none'
/** 主要按鈕：墨黑底。一個畫面盡量只放一顆。 */
export const btnPrimary = `${btnBase} bg-ink font-medium text-paper hover:bg-ink-soft`
/** 次要按鈕：放在灰底頁面上用白底 */
export const btnSecondary = `${btnBase} bg-surface text-ink hover:bg-surface-muted`
/** 次要按鈕：放在白卡上用細框 */
export const btnOutline = `${btnBase} border border-border-input text-ink hover:bg-surface-muted`
/** 危險動作（刪除） */
export const btnDanger = `${btnBase} bg-visit-red-bg text-visit-red-ink hover:brightness-95`
/** 文字連結式按鈕 */
export const btnText = 'inline-flex min-h-11 items-center px-1.5 text-[13px] text-ink underline underline-offset-4 transition-colors hover:text-sage disabled:opacity-40'
/** 表單輸入框 */
export const inputCls = 'h-[50px] w-full rounded-lg border border-border-input bg-[#F7F7F3] px-4 text-base text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-ink'

/** 頁首：標題＋補充說明，右側放動作按鈕 */
export function PageHeader({ title, meta, children }: { title: string; meta?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 px-4 pb-1 pt-4 lg:px-5 lg:pt-5">
      <h1 className="text-2xl text-ink">{title}</h1>
      {meta && <span className="text-[13px] text-ink-muted">{meta}</span>}
      {children && <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}

export function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={active}
      className={`flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-[13px] transition-colors ${
        active ? 'bg-ink text-paper' : 'bg-surface text-ink hover:bg-surface-muted'
      }`}>
      {children}
    </button>
  )
}

const TAG_KINDS = {
  neutral: 'bg-[#EFEFEA] text-ink-soft',
  sage: 'bg-sage-fresh text-visit-green-ink',
  ink: 'bg-ink text-paper',
  warn: 'bg-warn-bg text-warn-ink',
  danger: 'bg-visit-red-bg text-visit-red-ink',
} as const

export function Tag({ kind = 'neutral', children }: { kind?: keyof typeof TAG_KINDS; children: React.ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-[3px] text-xs ${TAG_KINDS[kind]}`}>{children}</span>
}

const LIGHT_STYLE: Record<VisitLightLevel, { dot: string; chip: string }> = {
  green:  { dot: 'bg-visit-green',  chip: 'bg-visit-green-bg text-visit-green-ink' },
  yellow: { dot: 'bg-visit-yellow', chip: 'bg-visit-yellow-bg text-visit-yellow-ink' },
  red:    { dot: 'bg-visit-red',    chip: 'bg-visit-red-bg text-visit-red-ink' },
}

/** 回訪燈號的圓點（永遠要搭配文字，不單獨出現） */
export function LightDot({ level, size = 10 }: { level: VisitLightLevel; size?: number }) {
  return <span aria-hidden="true" className={`shrink-0 rounded-full ${LIGHT_STYLE[level].dot}`} style={{ width: size, height: size }} />
}

/** 回訪燈號標籤：圓點＋「紅燈・138 天沒來」 */
export function VisitLightTag({ light }: { light: VisitLight }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full py-[3px] pl-2 pr-2.5 text-xs ${LIGHT_STYLE[light.level].chip}`}>
      <LightDot level={light.level} />
      {VISIT_LIGHT_LABEL[light.level]}・{light.days} 天沒來
    </span>
  )
}

export function SearchInput({ value, onChange, placeholder, className = '' }: {
  value: string; onChange: (v: string) => void; placeholder: string; className?: string
}) {
  return (
    <label className={`flex h-[46px] min-w-0 items-center gap-2.5 rounded-full bg-surface pl-4 pr-1 text-ink-muted ${className}`}>
      <Search size={17} strokeWidth={1.6} className="shrink-0" />
      <input type="search" value={value} onChange={e => onChange(e.target.value)}
        aria-label={placeholder} placeholder={placeholder}
        className="h-full min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint [&::-webkit-search-cancel-button]:hidden" />
      {value && (
        <button onClick={() => onChange('')} aria-label="清除搜尋"
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-muted">
          <X size={15} />
        </button>
      )}
    </label>
  )
}

/** 彈窗：手機從底部滑出，電腦置中 */
export function Modal({ title, onClose, children, footer }: {
  title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className="sheet-up flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-surface sm:max-w-[420px] sm:rounded-2xl"
        style={{ boxShadow: 'var(--t-shadow-md)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between py-3 pl-6 pr-3">
          <h2 className="text-lg text-ink">{title}</h2>
          <button onClick={onClose} aria-label="關閉"
            className="flex size-11 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted">
            <X size={18} />
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pb-2">{children}</div>
        {footer && (
          <div className="flex shrink-0 gap-2 px-6 pt-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export function FormField({ label, htmlFor, hint, children }: {
  label: string; htmlFor?: string; hint?: string; children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink">{label}</label>
      {children}
      {hint && <span className="text-xs text-ink-muted">{hint}</span>}
    </div>
  )
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 px-6 py-14 text-center">
      <p className="font-heading text-base text-ink">{title}</p>
      {hint && <p className="text-[13px] text-ink-muted">{hint}</p>}
    </div>
  )
}
