export default function BookLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--t-bg)' }}>
      {children}
    </div>
  )
}
