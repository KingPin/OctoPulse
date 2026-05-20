import { useCallback, useEffect, useState } from 'react'
import * as storage from '@/lib/storage'

export type Theme = 'dark' | 'light' | 'auto'

function resolveAuto(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: Theme): void {
  const resolved = theme === 'auto' ? resolveAuto() : theme
  const root = document.documentElement
  root.classList.toggle('dark', resolved === 'dark')
  root.classList.toggle('light', resolved === 'light')
}

export function useTheme(): readonly [Theme, (t: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(
    () => storage.get<Theme>('theme') ?? 'auto',
  )

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    if (theme !== 'auto') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (): void => applyTheme('auto')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const setTheme = useCallback((t: Theme) => {
    storage.set('theme', t)
    setThemeState(t)
  }, [])

  return [theme, setTheme] as const
}
