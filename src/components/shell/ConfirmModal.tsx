import { useEffect, useRef } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'

export type ConfirmVariant = 'default' | 'danger'

interface Props {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  variant?: ConfirmVariant
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

const VARIANT_CLASS: Record<ConfirmVariant, string> = {
  default:
    'border-[var(--color-accent)] bg-[var(--color-accent)] text-white hover:brightness-110',
  danger:
    'border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] text-[var(--color-danger)] hover:brightness-110',
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  variant = 'default',
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    confirmRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel, busy])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/60"
        onClick={() => !busy && onCancel()}
        aria-hidden
      />
      <div className="relative w-full max-w-md bg-[var(--color-canvas)] border border-[var(--color-border)] rounded-md shadow-2xl">
        <div className="flex items-start gap-3 p-5">
          <AlertTriangle
            className={
              variant === 'danger'
                ? 'w-5 h-5 text-[var(--color-danger)] shrink-0 mt-0.5'
                : 'w-5 h-5 text-[var(--color-attention)] shrink-0 mt-0.5'
            }
            aria-hidden
          />
          <div className="flex-1 min-w-0">
            <h2 id="confirm-title" className="text-sm font-semibold">
              {title}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
              {description}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="min-h-[36px] px-3 text-sm border border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] rounded-md disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`min-h-[36px] px-3 text-sm border rounded-md inline-flex items-center gap-2 disabled:opacity-50 ${VARIANT_CLASS[variant]}`}
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
