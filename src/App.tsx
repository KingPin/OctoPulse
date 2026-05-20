import { useState } from 'react'
import { Activity, Loader2, LogOut, Sun, Moon, MonitorSmartphone } from 'lucide-react'
import { useTheme, type Theme } from '@/hooks/useTheme'
import { useAuth } from '@/hooks/useAuth'
import { ToastViewport } from '@/components/shell/Toast'
import { PatEntryScreen } from '@/components/onboarding/PatEntryScreen'
import { DEMO_VIEWER } from '@/lib/demo'
import type { Viewer } from '@/lib/github/types'

function ThemeToggle() {
  const [theme, setTheme] = useTheme()
  const options: { value: Theme; label: string; Icon: typeof Sun }[] = [
    { value: 'dark', label: 'Dark', Icon: Moon },
    { value: 'light', label: 'Light', Icon: Sun },
    { value: 'auto', label: 'Auto', Icon: MonitorSmartphone },
  ]
  return (
    <div
      className="flex items-center border border-[var(--color-border)] rounded-md overflow-hidden"
      role="group"
      aria-label="Theme"
    >
      {options.map(({ value, label, Icon }) => {
        const active = theme === value
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-label={`Theme: ${label}`}
            aria-pressed={active}
            title={label}
            className={`min-w-[44px] min-h-[36px] flex items-center justify-center px-2 text-xs transition-colors ${
              active
                ? 'bg-[var(--color-canvas-subtle)] text-[var(--color-fg-default)]'
                : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)]'
            }`}
          >
            <Icon className="w-4 h-4" aria-hidden />
          </button>
        )
      })}
    </div>
  )
}

function App() {
  const { state, signIn, signOut } = useAuth()
  const [demo, setDemo] = useState(false)

  if (state.status === 'loading') {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2
          className="w-6 h-6 animate-spin text-[var(--color-fg-muted)]"
          aria-label="Loading"
        />
      </main>
    )
  }

  if (state.status === 'signed-out' && !demo) {
    return (
      <>
        <PatEntryScreen
          onSignedIn={signIn}
          onTryDemo={() => setDemo(true)}
        />
        <ToastViewport />
      </>
    )
  }

  const isDemo = demo && state.status === 'signed-out'
  const viewer: Viewer =
    state.status === 'signed-in' ? state.viewer : DEMO_VIEWER

  const handleExit = () => {
    if (isDemo) {
      setDemo(false)
    } else {
      signOut()
    }
  }

  return (
    <>
      <main className="min-h-screen flex flex-col">
        <header className="flex items-center justify-between px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-canvas-subtle)]">
          <div className="flex items-center gap-2">
            <Activity
              className="w-5 h-5 text-[var(--color-accent)]"
              aria-hidden
            />
            <span className="text-sm font-semibold">OctoPulse</span>
            {isDemo && (
              <span className="ml-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-[var(--color-attention-bg)] text-[var(--color-attention)] border border-[var(--color-attention-border)]">
                Demo
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="flex items-center gap-2 text-sm">
              <img
                src={viewer.avatarUrl}
                alt=""
                className="w-6 h-6 rounded-full"
              />
              <span className="text-[var(--color-fg-muted)]">
                @{viewer.login}
              </span>
            </div>
            <button
              type="button"
              onClick={handleExit}
              className="min-w-[44px] min-h-[36px] flex items-center gap-1 px-2 text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] border border-[var(--color-border)] rounded-md"
              aria-label={isDemo ? 'Exit demo' : 'Sign out'}
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden />
              <span>{isDemo ? 'Exit demo' : 'Sign out'}</span>
            </button>
          </div>
        </header>

        <section className="flex-1 flex items-center justify-center p-8 text-[var(--color-fg-muted)] text-sm">
          Dashboard surfaces will appear here. (Steps 4–10.)
        </section>
      </main>

      <ToastViewport />
    </>
  )
}

export default App
