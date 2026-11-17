'use client'

import { createContext, useContext, useEffect } from 'react'

// 這次改版決定只保留淺色（白紙墨線），不提供深色模式。
// 保留 Provider 與 useTheme 介面，之後若要加回深色不用動到呼叫端。
type Theme = 'light'
const ThemeContext = createContext<{ theme: Theme }>({ theme: 'light' })

export function useTheme() { return useContext(ThemeContext) }

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 清掉舊版留下的深色設定，避免舊裝置卡在深色 class
    const root = document.documentElement
    root.classList.remove('dark')
    root.classList.add('light')
    try { localStorage.removeItem('ada-theme') } catch {}
  }, [])

  return (
    <ThemeContext.Provider value={{ theme: 'light' }}>
      {children}
    </ThemeContext.Provider>
  )
}
