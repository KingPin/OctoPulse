import {
  Activity,
  LogOut,
  RefreshCw,
  Settings,
  Sun,
  Moon,
  MonitorSmartphone,
} from 'lucide-react'
import { useTheme, type Theme } from '@/hooks/useTheme'
import type { Viewer } from '@/lib/github/types'

interface Props {
  viewer: Viewer
  isDemo: boolean
  isFetching: boolean
  lastUpdatedAt: number | null
  onRefresh: () => void
  onOpenSettings: () => void
  onSignOut: () => void
}

const SECOND_MS = 1000
const MINUTE_MS = 60 * SECOND_MS
const HOUR_MS = 60 * MINUTE_MS

function formatLastUpdated(ts: number | null): string {
  if (ts === null) return 'never'
  const delta = Date.now() - ts
  if (delta < 30 * SECOND_MS) return 'just now'
  if (delta < MINUTE_MS) return `${Math.floor(delta / SECOND_MS)}s ago`
  if (delta < HOUR_MS) return `${Math.floor(delta / MINUTE_MS)}m ago`
  return `${Math.floor(delta / HOUR_MS)}h ago`
}

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
            className={`min-w-[36px] min-h-[32px] flex items-center justify-center px-2 text-xs transition-colors ${
              active
                ? 'bg-[var(--color-canvas-subtle)] text-[var(--color-fg-default)]'
                : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" aria-hidden />
          </button>
        )
      })}
    </div>
  )
}

export function TopBar({
  viewer,
  isDemo,
  isFetching,
  lastUpdatedAt,
  onRefresh,
  onOpenSettings,
  onSignOut,
}: Props) {
  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-canvas-subtle)] sticky top-0 z-10">
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
        <div className="flex items-center gap-2 text-xs text-[var(--color-fg-muted)]">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isFetching}
            aria-label="Refresh dashboard"
            title="Refresh"
            className="min-w-[36px] min-h-[32px] flex items-center justify-center border border-[var(--color-border)] rounded-md hover:text-[var(--color-fg-default)] disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`}
              aria-hidden
            />
          </button>
          <span className="hidden sm:inline">
            Updated {formatLastUpdated(lastUpdatedAt)}
          </span>
        </div>

        <ThemeToggle />

        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Settings"
          title="Settings"
          className="min-w-[36px] min-h-[32px] flex items-center justify-center border border-[var(--color-border)] rounded-md text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)]"
        >
          <Settings className="w-3.5 h-3.5" aria-hidden />
        </button>

        <div className="flex items-center gap-2 text-sm">
          <img
            src={viewer.avatarUrl}
            alt=""
            className="w-6 h-6 rounded-full"
          />
          <span className="hidden sm:inline text-[var(--color-fg-muted)]">
            @{viewer.login}
          </span>
        </div>

        <button
          type="button"
          onClick={onSignOut}
          className="min-w-[36px] min-h-[32px] flex items-center gap-1 px-2 text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] border border-[var(--color-border)] rounded-md"
          aria-label={isDemo ? 'Exit demo' : 'Sign out'}
        >
          <LogOut className="w-3.5 h-3.5" aria-hidden />
          <span className="hidden sm:inline">
            {isDemo ? 'Exit demo' : 'Sign out'}
          </span>
        </button>
      </div>
    </header>
  )
}
