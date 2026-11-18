// 總覽頁（以及沒有自己 loading.tsx 的後台頁面）切換時立即顯示的骨架畫面，
// 避免點下去後畫面停住、看起來像沒反應。
export default function Loading() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden animate-pulse">
      <div className="h-14 border-b border-[var(--t-border)] bg-[var(--t-surface)] shrink-0" />
      <div className="flex-1 bg-[var(--t-surface)] p-8 space-y-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-[var(--t-border)]" />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-8 py-4 border-b border-[var(--t-border)]">
            <div className="h-3 w-16 rounded bg-[var(--t-border)]" />
            <div className="h-3 w-32 rounded bg-[var(--t-border)]" />
            <div className="h-3 w-10 rounded bg-[var(--t-border)] ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
