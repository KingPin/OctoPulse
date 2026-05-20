import { useEffect } from 'react'
import {
  X,
  Settings2,
  GitBranch,
  Palette,
  Sparkles,
  LogOut,
  Pencil,
} from 'lucide-react'
import { useTheme, type Theme } from '@/hooks/useTheme'
import { LLMSettings } from './LLMSettings'
import type { TrackedRepo } from '@/hooks/useRepos'

interface Props {
  open: boolean
  onClose: () => void
  trackedRepos: TrackedRepo[]
  isDemo: boolean
  onEditRepos: () => void
  onSignOut: () => void
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Settings2
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="border-t border-[var(--color-border-muted)] py-5 first:border-t-0">
      <div className="flex items-center gap-2 mb-3">
        <Icon
          className="w-4 h-4 text-[var(--color-fg-muted)]"
          aria-hidden
        />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
          {title}
        </h3>
      </div>
      {children}
    </section>
  )
}

export function SettingsPanel({
  open,
  onClose,
  trackedRepos,
  isDemo,
  onEditRepos,
  onSignOut,
}: Props) {
  const [theme, setTheme] = useTheme()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const themeOptions: { value: Theme; label: string }[] = [
    { value: 'dark', label: 'Dark' },
    { value: 'light', label: 'Light' },
    { value: 'auto', label: 'Auto' },
  ]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
      className="fixed inset-0 z-30"
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <aside className="absolute right-0 top-0 h-full w-full sm:w-[440px] bg-[var(--color-canvas)] border-l border-[var(--color-border)] shadow-2xl flex flex-col">
        <header className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <Settings2
              className="w-4 h-4 text-[var(--color-fg-muted)]"
              aria-hidden
            />
            <h2 className="text-sm font-semibold">Settings</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="min-w-[36px] min-h-[36px] flex items-center justify-center text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] rounded-md"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5">
          <Section icon={Palette} title="Appearance">
            <div className="flex gap-2">
              {themeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTheme(opt.value)}
                  aria-pressed={theme === opt.value}
                  className={`min-h-[36px] px-3 text-sm rounded-md border ${
                    theme === opt.value
                      ? 'border-[var(--color-accent)] text-[var(--color-fg-default)] bg-[var(--color-canvas-subtle)]'
                      : 'border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Section>

          <Section icon={GitBranch} title={`Tracked repos (${trackedRepos.length})`}>
            {isDemo ? (
              <p className="text-xs text-[var(--color-fg-muted)]">
                Demo mode uses a fixed mock workspace.
              </p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onEditRepos()
                  }}
                  className="flex items-center gap-1 min-h-[36px] px-3 text-xs border border-[var(--color-border)] rounded-md text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] mb-3"
                >
                  <Pencil className="w-3.5 h-3.5" aria-hidden />
                  Edit repo list
                </button>
                <ul className="max-h-48 overflow-y-auto border border-[var(--color-border-muted)] rounded-md">
                  {trackedRepos.map((r) => (
                    <li
                      key={r.nameWithOwner}
                      className="px-3 py-1.5 border-t border-[var(--color-border-muted)] first:border-t-0 font-mono text-xs text-[var(--color-fg-muted)]"
                    >
                      {r.nameWithOwner}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Section>

          <Section icon={Sparkles} title="LLM provider">
            <p className="text-xs text-[var(--color-fg-muted)] mb-3">
              Configure your AI provider to unlock thread summarization and
              issue tone classification.
            </p>
            <LLMSettings />
          </Section>

          <Section icon={LogOut} title="Account">
            <button
              type="button"
              onClick={() => {
                onClose()
                onSignOut()
              }}
              className="flex items-center gap-1 min-h-[36px] px-3 text-sm border border-[var(--color-danger-border)] text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)] rounded-md"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden />
              {isDemo ? 'Exit demo' : 'Sign out & clear local data'}
            </button>
            <p className="mt-2 text-xs text-[var(--color-fg-muted)]">
              Removes the token and tracked repos from this browser.
            </p>
          </Section>
        </div>
      </aside>
    </div>
  )
}
