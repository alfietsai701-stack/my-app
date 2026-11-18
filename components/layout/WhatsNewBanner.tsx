'use client'

import { useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import { WHATS_NEW } from '@/lib/whats-new-content'

/** 改版公告：放在內容最上方的 inline 卡片，按「知道了」後收起並記錄，之後不再出現 */
export default function WhatsNewBanner({ userName }: { userName: string }) {
  const [open, setOpen] = useState(true)
  if (!open) return null

  function dismiss() {
    setOpen(false)
    // 記錄失敗也不打擾使用者，下次登入再顯示一次而已
    fetch('/api/whats-new', { method: 'POST' }).catch(() => {})
  }

  return (
    <section aria-labelledby="whats-new-title"
      className="mx-4 mt-3 flex shrink-0 flex-col gap-3 rounded-2xl bg-ink px-5 py-4 text-paper lg:mx-5 lg:mt-4 lg:flex-row lg:items-start lg:gap-6 lg:px-6 lg:py-5">
      <div className="flex items-start justify-between gap-3 lg:w-[220px] lg:shrink-0 lg:flex-col lg:justify-start">
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-1.5 text-xs text-sage-soft">
            <Sparkles size={14} strokeWidth={1.6} aria-hidden="true" />新版本
          </span>
          <h2 id="whats-new-title" className="font-heading text-xl font-semibold tracking-[0.15em] text-paper">
            {WHATS_NEW.title}
          </h2>
        </div>
        <button onClick={dismiss} aria-label="關閉改版公告"
          className="-mr-2 -mt-1 flex size-11 shrink-0 items-center justify-center rounded-full text-sage-soft hover:bg-white/10 hover:text-paper lg:hidden">
          <X size={18} />
        </button>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <p className="text-[13px] leading-relaxed text-[#D9D9D1]">
          {userName ? `${userName}，` : ''}{WHATS_NEW.intro}
        </p>
        <ul className="grid grid-cols-1 gap-x-6 gap-y-1.5 lg:grid-cols-2">
          {WHATS_NEW.items.map(item => (
            <li key={item.label} className="flex gap-2.5 text-[13px] leading-relaxed">
              <span className="w-[4.5em] shrink-0 font-bold text-paper">{item.label}</span>
              <span className="text-[#D9D9D1]">{item.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <button onClick={dismiss}
        className="h-11 shrink-0 self-stretch rounded-full bg-paper px-6 text-sm font-medium tracking-wider text-ink transition-colors hover:bg-white lg:self-center">
        知道了
      </button>
    </section>
  )
}
