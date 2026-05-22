import { useEffect, useSyncExternalStore } from 'react'
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

// Module-scoped store so every useTheme() consumer shares one source of truth.
// Without this, each component held independent useState and would drift after
// any setter call.
let current: Theme = storage.get<Theme>('theme') ?? 'auto'
const listeners = new Set<() => void>()

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

function getSnapshot(): Theme {
  return current
}

function setTheme(t: Theme): void {
  if (t === current) return
  current = t
  storage.set('theme', t)
  listeners.forEach((cb) => cb())
}

export function useTheme(): readonly [Theme, (t: Theme) => void] {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

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

  return [theme, setTheme] as const
}
