export default function Loading() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden animate-pulse">
      <div className="h-14 border-b border-[var(--t-border)] bg-[var(--t-surface)] shrink-0" />
      <div className="flex-1 bg-[var(--t-bg)] p-6 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-[var(--t-surface)] border border-[var(--t-border)]" />
        ))}
      </div>
    </div>
  )
}
