'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { PROVIDER_LABEL, type OAuthProvider } from '@/lib/oauth-labels'

type Account = { id: string; provider: OAuthProvider; displayName: string | null; email: string | null; createdAt: string; lastUsedAt: string | null }
type Data = { providers: { provider: OAuthProvider; enabled: boolean }[]; accounts: Account[] }

const ERRORS: Record<string, string> = {
  already_bound: '這個第三方帳號已經綁定在其他後台帳號上，請先從那個帳號解除綁定。',
  cancelled: '已取消綁定。',
  invalid_state: '綁定逾時或驗證失敗，請再試一次。',
  exchange_failed: '暫時無法向第三方平台確認身分，請稍後再試。',
  provider_disabled: '這個登入方式尚未開放。',
}

const fmt = (iso: string) => new Date(iso).toLocaleDateString('zh-TW', { year: 'numeric', month: 'numeric', day: 'numeric' })

/** 「登入方式」：綁定／解除自己的 Google、LINE、Facebook、Apple 登入 */
export default function LoginMethodsModal({ onClose, flash }: {
  onClose: () => void
  flash?: { linked?: string | null; error?: string | null }
}) {
  const [data, setData] = useState<Data | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(() => {
    if (flash?.error) return { kind: 'err', text: ERRORS[flash.error] ?? '綁定失敗，請再試一次。' }
    if (flash?.linked && flash.linked in PROVIDER_LABEL) {
      return { kind: 'ok', text: `已綁定 ${PROVIDER_LABEL[flash.linked as OAuthProvider]}，下次可以直接用它登入。` }
    }
    return null
  })

  function load() {
    return fetch('/api/auth/oauth-accounts')
      .then(r => (r.ok ? r.json() : null))
      .then((d: Data | null) => { if (d) setData(d) })
      .catch(() => {})
  }
  useEffect(() => { load() }, [])

  async function unlink(a: Account) {
    if (!confirm(`確定要解除 ${PROVIDER_LABEL[a.provider]} 綁定？解除後就不能用它登入。`)) return
    setBusy(a.id); setMessage(null)
    const res = await fetch(`/api/auth/oauth-accounts/${a.id}`, { method: 'DELETE' })
    setBusy(null)
    if (res.ok) { setMessage({ kind: 'ok', text: `已解除 ${PROVIDER_LABEL[a.provider]} 綁定。` }); load() }
    else setMessage({ kind: 'err', text: '解除失敗，請再試一次。' })
  }

  const returnTo = typeof window === 'undefined' ? '/' : window.location.pathname

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="lm-title"
        className="sheet-up w-full max-w-md rounded-2xl bg-surface p-6"
        style={{ boxShadow: 'var(--t-shadow-md)' }}
        onClick={e => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h2 id="lm-title" className="text-lg text-ink">登入方式</h2>
          <button onClick={onClose} aria-label="關閉"
            className="flex size-11 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted">
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-[13px] text-ink-muted">綁定後，登入頁就能直接用這些帳號登入。帳號密碼登入會一直保留。</p>

        {message && (
          <p role={message.kind === 'err' ? 'alert' : 'status'}
            className={`mb-4 rounded-lg px-4 py-2.5 text-[13px] ${message.kind === 'err' ? 'bg-visit-red-bg text-visit-red-ink' : 'bg-sage-tint text-accent-foreground'}`}>
            {message.text}
          </p>
        )}

        <div className="flex flex-col">
          {!data && <p className="py-2 text-[13px] text-ink-muted">載入中…</p>}
          {data?.providers.map(({ provider, enabled }) => {
            const acc = data.accounts.find(a => a.provider === provider)
            return (
              <div key={provider} className="flex min-h-[60px] items-center justify-between gap-3 border-b border-line-soft py-2.5 last:border-0">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className={`text-[15px] font-medium ${enabled || acc ? 'text-ink' : 'text-ink-faint'}`}>{PROVIDER_LABEL[provider]}</span>
                  <span className="truncate text-xs text-ink-muted">
                    {acc
                      ? `已綁定${acc.displayName ? ` · ${acc.displayName}` : ''} · ${fmt(acc.createdAt)}`
                      : enabled ? '未綁定' : '尚未開放'}
                  </span>
                </span>
                {acc ? (
                  <button onClick={() => unlink(acc)} disabled={busy === acc.id}
                    className="inline-flex min-h-11 shrink-0 items-center px-1.5 text-[13px] text-ink underline underline-offset-4 hover:text-sage disabled:opacity-40">
                    {busy === acc.id ? '解除中' : '解除綁定'}
                  </button>
                ) : enabled ? (
                  // 整頁導向第三方授權頁（API 路由，用 <a> 不用 <Link>）
                  <a href={`/api/auth/oauth/${provider}?mode=bind&return=${encodeURIComponent(returnTo)}`}
                    className="inline-flex h-11 shrink-0 items-center rounded-full border border-border-input px-4 text-[13px] text-ink transition-colors hover:bg-surface-muted">
                    綁定
                  </a>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
