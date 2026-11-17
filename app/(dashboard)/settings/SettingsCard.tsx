/** 設定頁的卡片：標題列、內容、底部動作列（貼齊卡片底部，讓同一列的卡片看起來對齊） */
export function SettingsCard({ title, hint, action, footer, className = '', children }: {
  title: string; hint?: string; action?: React.ReactNode; footer?: React.ReactNode
  className?: string; children: React.ReactNode
}) {
  return (
    <section className={`flex min-w-0 flex-col gap-4 rounded-2xl bg-surface p-5 lg:px-[22px] lg:py-5 ${className}`}>
      <div className="flex min-h-11 items-center justify-between gap-3">
        <span className="flex flex-col gap-0.5">
          <h2 className="text-[19px] text-ink">{title}</h2>
          {hint && <span className="text-xs text-ink-muted">{hint}</span>}
        </span>
        {action}
      </div>
      {children}
      {footer && <div className="mt-auto flex flex-wrap items-center gap-3 pt-1">{footer}</div>}
    </section>
  )
}
