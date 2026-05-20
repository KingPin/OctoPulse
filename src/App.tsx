import { Activity, Loader2, LogOut, Sun, Moon, MonitorSmartphone } from 'lucide-react'
import { useTheme, type Theme } from '@/hooks/useTheme'
import { useAuth } from '@/hooks/useAuth'
import { ToastViewport } from '@/components/shell/Toast'
import { PatEntryScreen } from '@/components/onboarding/PatEntryScreen'

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

  if (state.status === 'signed-out') {
    return (
      <>
        <PatEntryScreen onSignedIn={signIn} />
        <ToastViewport />
      </>
    )
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
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="flex items-center gap-2 text-sm">
              <img
                src={state.viewer.avatarUrl}
                alt=""
                className="w-6 h-6 rounded-full"
              />
              <span className="text-[var(--color-fg-muted)]">
                @{state.viewer.login}
              </span>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="min-w-[44px] min-h-[36px] flex items-center gap-1 px-2 text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] border border-[var(--color-border)] rounded-md"
              aria-label="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden />
              <span>Sign out</span>
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
