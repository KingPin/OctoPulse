import { useEffect, useRef, useState } from 'react'
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
  rateLimitRemaining: number | null
  rateLimitLimit: number | null
  rateLimitResetAt: number | null
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

function formatResetIn(resetAt: number | null): string {
  if (resetAt === null) return ''
  const delta = resetAt - Date.now()
  if (delta <= 0) return 'now'
  if (delta < MINUTE_MS) return `${Math.ceil(delta / SECOND_MS)}s`
  if (delta < HOUR_MS) return `${Math.ceil(delta / MINUTE_MS)}m`
  return `${Math.ceil(delta / HOUR_MS)}h`
}

interface RateLimitChipProps {
  remaining: number
  limit: number | null
  resetAt: number | null
}

function RateLimitChip({ remaining, limit, resetAt }: RateLimitChipProps) {
  const denom = limit ?? 5000
  const ratio = remaining / denom
  const low = ratio < 0.1
  const warn = !low && ratio < 0.25
  const tone = low
    ? 'text-[var(--color-danger)] border-[var(--color-danger-border)] bg-[var(--color-danger-bg)]'
    : warn
      ? 'text-[var(--color-attention)] border-[var(--color-attention-border)] bg-[var(--color-attention-bg)]'
      : 'text-[var(--color-fg-muted)] border-[var(--color-border)]'
  const resetLabel = resetAt
    ? `Resets in ${formatResetIn(resetAt)} (${new Date(resetAt).toLocaleTimeString()})`
    : 'Reset time unknown'
  return (
    <span
      className={`hidden sm:inline-flex items-center px-1.5 py-0.5 text-[11px] font-mono border rounded-md ${tone}`}
      title={`GitHub API: ${remaining.toLocaleString()} of ${denom.toLocaleString()} remaining. ${resetLabel}.`}
      aria-label={`GitHub API ${remaining} of ${denom} remaining`}
    >
      {remaining.toLocaleString()}/{denom.toLocaleString()}
    </span>
  )
}

const THEME_CYCLE: Record<Theme, { next: Theme; label: string; Icon: typeof Sun }> = {
  auto: { next: 'light', label: 'Auto', Icon: MonitorSmartphone },
  light: { next: 'dark', label: 'Light', Icon: Sun },
  dark: { next: 'auto', label: 'Dark', Icon: Moon },
}

function ThemeToggle() {
  const [theme, setTheme] = useTheme()
  const { next, label, Icon } = THEME_CYCLE[theme]
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Theme: ${label}. Click to cycle.`}
      title={`Theme: ${label} (click to cycle)`}
      className="min-w-[36px] min-h-[36px] flex items-center justify-center border border-[var(--color-border)] rounded-md text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)]"
    >
      <Icon className="w-3.5 h-3.5" aria-hidden />
    </button>
  )
}

export function TopBar({
  viewer,
  isDemo,
  isFetching,
  lastUpdatedAt,
  rateLimitRemaining,
  rateLimitLimit,
  rateLimitResetAt,
  onRefresh,
  onOpenSettings,
  onSignOut,
}: Props) {
  return (
    <header className="flex items-center justify-between gap-2 px-3 sm:px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-canvas-subtle)] sticky top-0 z-10">
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
            className="min-w-[36px] min-h-[36px] flex items-center justify-center border border-[var(--color-border)] rounded-md hover:text-[var(--color-fg-default)] disabled:opacity-50"
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

        {!isDemo && rateLimitRemaining !== null && (
          <RateLimitChip
            remaining={rateLimitRemaining}
            limit={rateLimitLimit}
            resetAt={rateLimitResetAt}
          />
        )}

        <ThemeToggle />

        <UserMenu
          viewer={viewer}
          isDemo={isDemo}
          lastUpdatedAt={lastUpdatedAt}
          onOpenSettings={onOpenSettings}
          onSignOut={onSignOut}
        />
      </div>
    </header>
  )
}

interface UserMenuProps {
  viewer: Viewer
  isDemo: boolean
  lastUpdatedAt: number | null
  onOpenSettings: () => void
  onSignOut: () => void
}

function UserMenu({
  viewer,
  isDemo,
  lastUpdatedAt,
  onOpenSettings,
  onSignOut,
}: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for @${viewer.login}`}
        className="flex items-center gap-2 min-h-[36px] px-1.5 border border-[var(--color-border)] rounded-md hover:bg-[var(--color-canvas)] text-sm"
      >
        <img src={viewer.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
        <span className="hidden sm:inline text-[var(--color-fg-muted)]">
          @{viewer.login}
        </span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1 w-56 z-20 border border-[var(--color-border)] bg-[var(--color-canvas-subtle)] rounded-md shadow-lg overflow-hidden text-sm"
        >
          <div className="px-3 py-2 border-b border-[var(--color-border-muted)]">
            <div className="font-mono text-xs text-[var(--color-fg-default)]">
              @{viewer.login}
            </div>
            <div className="text-[11px] text-[var(--color-fg-subtle)]">
              Updated {formatLastUpdated(lastUpdatedAt)}
            </div>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onOpenSettings()
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-[var(--color-fg-default)] hover:bg-[var(--color-canvas)]"
          >
            <Settings className="w-3.5 h-3.5 text-[var(--color-fg-muted)]" aria-hidden />
            Settings
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onSignOut()
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-[var(--color-fg-default)] hover:bg-[var(--color-canvas)]"
          >
            <LogOut className="w-3.5 h-3.5 text-[var(--color-fg-muted)]" aria-hidden />
            {isDemo ? 'Exit demo' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  )
}
