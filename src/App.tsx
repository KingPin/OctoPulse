import { Activity, Sun, Moon, MonitorSmartphone } from 'lucide-react'
import { useTheme, type Theme } from '@/hooks/useTheme'
import { ToastViewport } from '@/components/shell/Toast'
import { toast } from '@/hooks/useToast'

function ThemeButton({
  value,
  label,
  Icon,
  active,
  onClick,
}: {
  value: Theme
  label: string
  Icon: typeof Sun
  active: boolean
  onClick: (v: Theme) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      aria-label={`Theme: ${label}`}
      aria-pressed={active}
      className={`min-w-[44px] min-h-[44px] flex items-center gap-2 px-3 rounded-md border text-sm transition-colors ${
        active
          ? 'border-[var(--color-accent)] bg-[var(--color-canvas-subtle)] text-[var(--color-fg-default)]'
          : 'border-[var(--color-border)] bg-transparent text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)]'
      }`}
    >
      <Icon className="w-4 h-4" aria-hidden />
      <span>{label}</span>
    </button>
  )
}

function App() {
  const [theme, setTheme] = useTheme()

  return (
    <>
      <main className="min-h-screen flex flex-col items-center justify-center p-8 gap-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Activity
              className="w-8 h-8 text-[var(--color-accent)]"
              aria-hidden
            />
            <h1 className="text-3xl font-semibold tracking-tight">OctoPulse</h1>
          </div>
          <p className="text-[var(--color-fg-muted)]">
            Maintainer command center — primitives wired.
          </p>
        </div>

        <div className="flex gap-2" role="group" aria-label="Theme">
          <ThemeButton
            value="dark"
            label="Dark"
            Icon={Moon}
            active={theme === 'dark'}
            onClick={setTheme}
          />
          <ThemeButton
            value="light"
            label="Light"
            Icon={Sun}
            active={theme === 'light'}
            onClick={setTheme}
          />
          <ThemeButton
            value="auto"
            label="Auto"
            Icon={MonitorSmartphone}
            active={theme === 'auto'}
            onClick={setTheme}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => toast('Hello from OctoPulse', 'info')}
            className="px-3 py-2 text-sm border border-[var(--color-border)] rounded-md hover:bg-[var(--color-canvas-subtle)]"
          >
            Info toast
          </button>
          <button
            type="button"
            onClick={() => toast('Operation succeeded', 'success')}
            className="px-3 py-2 text-sm border border-[var(--color-border)] rounded-md hover:bg-[var(--color-canvas-subtle)]"
          >
            Success
          </button>
          <button
            type="button"
            onClick={() => toast('Something looks off', 'warning')}
            className="px-3 py-2 text-sm border border-[var(--color-border)] rounded-md hover:bg-[var(--color-canvas-subtle)]"
          >
            Warning
          </button>
          <button
            type="button"
            onClick={() => toast('Request failed', 'error')}
            className="px-3 py-2 text-sm border border-[var(--color-border)] rounded-md hover:bg-[var(--color-canvas-subtle)]"
          >
            Error
          </button>
        </div>
      </main>

      <ToastViewport />
    </>
  )
}

export default App
