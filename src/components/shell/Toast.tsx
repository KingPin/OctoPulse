import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useToasts, dismiss, type ToastVariant } from '@/hooks/useToast'

const iconFor: Record<ToastVariant, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
}

const styleFor: Record<ToastVariant, string> = {
  info: 'border-[var(--color-border)] bg-[var(--color-canvas-subtle)] text-[var(--color-fg-default)]',
  success:
    'border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-[var(--color-success)]',
  warning:
    'border-[var(--color-attention-border)] bg-[var(--color-attention-bg)] text-[var(--color-attention)]',
  error:
    'border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] text-[var(--color-danger)]',
}

export function ToastViewport() {
  const toasts = useToasts()
  if (toasts.length === 0) return null
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((t) => {
        const Icon = iconFor[t.variant]
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-md border shadow-lg ${styleFor[t.variant]}`}
            role={t.variant === 'error' ? 'alert' : 'status'}
          >
            <Icon className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
            <span className="text-sm flex-1 leading-snug">{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="opacity-60 hover:opacity-100 min-w-[44px] min-h-[44px] -m-3 p-3 flex items-center justify-center"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" aria-hidden />
            </button>
          </div>
        )
      })}
    </div>
  )
}
