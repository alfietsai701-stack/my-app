export default function Loading() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden animate-pulse">
      <div className="h-14 border-b border-[var(--t-border)] bg-[var(--t-surface)] shrink-0" />
      <div className="flex-1 bg-[var(--t-surface)] p-8 space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-8 py-4 border-b border-[var(--t-border)]">
            <div className="h-3 w-24 rounded bg-[var(--t-border)]" />
            <div className="h-3 w-28 rounded bg-[var(--t-border)]" />
            <div className="h-3 w-10 rounded bg-[var(--t-border)] ml-auto" />
            <div className="h-3 w-8 rounded bg-[var(--t-border)]" />
          </div>
        ))}
      </div>
    </div>
  )
}
