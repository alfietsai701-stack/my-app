'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light'
const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({ theme: 'dark', toggle: () => {} })

export function useTheme() { return useContext(ThemeContext) }

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const saved = localStorage.getItem('ada-theme') as Theme | null
    const initial = saved ?? 'light'
    setTheme(initial)
    applyTheme(initial)
  }, [])

  function applyTheme(t: Theme) {
    const root = document.documentElement
    root.classList.remove('dark', 'light')
    root.classList.add(t)
  }

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    applyTheme(next)
    localStorage.setItem('ada-theme', next)
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}
