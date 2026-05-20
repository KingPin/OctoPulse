import { useEffect, useState } from 'react'

export type ToastVariant = 'info' | 'success' | 'warning' | 'error'

export interface Toast {
  id: number
  variant: ToastVariant
  message: string
  duration: number
}

type Listener = (toasts: Toast[]) => void

const listeners = new Set<Listener>()
let toasts: Toast[] = []
let nextId = 1

function notify(): void {
  for (const l of listeners) l(toasts)
}

export function toast(
  message: string,
  variant: ToastVariant = 'info',
  duration = 4000,
): void {
  const id = nextId++
  const t: Toast = { id, variant, message, duration }
  toasts = [...toasts, t]
  notify()
  if (duration > 0) {
    setTimeout(() => dismiss(id), duration)
  }
}

export function dismiss(id: number): void {
  toasts = toasts.filter((t) => t.id !== id)
  notify()
}

export function useToasts(): Toast[] {
  const [state, setState] = useState<Toast[]>(toasts)
  useEffect(() => {
    listeners.add(setState)
    return () => {
      listeners.delete(setState)
    }
  }, [])
  return state
}
