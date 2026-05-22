import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CircleAlert,
  CircleCheck,
  CircleDot,
  GitBranch,
  HelpCircle,
  Hourglass,
  Inbox,
  Loader2,
} from 'lucide-react'
import { TopBar } from './TopBar'
import { SettingsPanel } from './SettingsPanel'
import { useDashboardData } from '@/hooks/useDashboardData'
import { ActionInbox } from '@/components/inbox/ActionInbox'
import { categorize } from '@/components/inbox/categorize'
import { RepoPulseGrid } from '@/components/pulse/RepoPulseGrid'
import { StaleWatch } from '@/components/stale/StaleWatch'
import { staleWatch } from '@/components/stale/staleness'
import type { TrackedRepo } from '@/hooks/useRepos'
import type { Viewer } from '@/lib/github/types'

interface Props {
  viewer: Viewer
  isDemo: boolean
  trackedRepos: TrackedRepo[]
  onSignOut: () => void
  onEditRepos: () => void
}

interface SectionHeaderProps {
  icon: typeof Inbox
  title: string
  count?: number
  caption?: string
  info?: React.ReactNode
}

function SectionHeader({ icon: Icon, title, count, caption, info }: SectionHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 mb-3">
      <div className="flex items-center gap-2">
        <Icon
          className="w-4 h-4 text-[var(--color-fg-muted)]"
          aria-hidden
        />
        <h2 className="text-base font-semibold">{title}</h2>
        {typeof count === 'number' && (
          <span className="text-xs font-mono text-[var(--color-fg-subtle)] px-1.5 py-0.5 bg-[var(--color-canvas-subtle)] rounded-md">
            {count}
          </span>
        )}
        {info}
      </div>
      {caption && (
        <span className="text-xs text-[var(--color-fg-subtle)]">{caption}</span>
      )}
    </div>
  )
}

function HealthLegend() {
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
        aria-label="How health is computed"
        aria-expanded={open}
        className="text-[var(--color-fg-subtle)] hover:text-[var(--color-fg-default)]"
      >
        <HelpCircle className="w-3.5 h-3.5" aria-hidden />
      </button>
      {open && (
        <div
          role="dialog"
          className="absolute left-0 mt-1 w-72 z-20 p-3 border border-[var(--color-border)] bg-[var(--color-canvas-subtle)] rounded-md shadow-lg text-xs"
        >
          <p className="font-semibold text-sm mb-2">How health is computed</p>
          <ul className="flex flex-col gap-2 text-[var(--color-fg-muted)]">
            <li className="flex items-start gap-2">
              <CircleAlert
                className="w-3.5 h-3.5 text-[var(--color-danger)] mt-0.5 shrink-0"
                aria-hidden
              />
              <span>
                <strong className="text-[var(--color-fg-default)]">
                  Needs attention
                </strong>{' '}
                — default-branch build failing, or any open thread idle ≥7
                days.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CircleDot
                className="w-3.5 h-3.5 text-[var(--color-attention)] mt-0.5 shrink-0"
                aria-hidden
              />
              <span>
                <strong className="text-[var(--color-fg-default)]">Stale</strong>{' '}
                — any open thread idle ≥3 days.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CircleCheck
                className="w-3.5 h-3.5 text-[var(--color-success)] mt-0.5 shrink-0"
                aria-hidden
              />
              <span>
                <strong className="text-[var(--color-fg-default)]">Healthy</strong>{' '}
                — everything fresh and CI green.
              </span>
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}

export function Dashboard({
  viewer,
  isDemo,
  trackedRepos,
  onSignOut,
  onEditRepos,
}: Props) {
  const { state, refresh } = useDashboardData({ trackedRepos, isDemo })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const inboxCount = useMemo(
    () => categorize(state.snapshots, viewer.login).length,
    [state.snapshots, viewer.login],
  )
  const staleCount = useMemo(
    () => staleWatch(state.snapshots).length,
    [state.snapshots],
  )

  return (
    <main className="min-h-screen flex flex-col">
      <TopBar
        viewer={viewer}
        isDemo={isDemo}
        isFetching={state.isFetching}
        lastUpdatedAt={state.lastUpdatedAt}
        rateLimitRemaining={state.rateLimitRemaining}
        rateLimitLimit={state.rateLimitLimit}
        rateLimitResetAt={state.rateLimitResetAt}
        onRefresh={refresh}
        onOpenSettings={() => setSettingsOpen(true)}
        onSignOut={onSignOut}
      />

      <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-10">
        {state.isFetching && state.snapshots.length === 0 && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-[var(--color-fg-muted)]">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            Loading repos…
          </div>
        )}

        {!state.isFetching && state.snapshots.length === 0 && state.error && (
          <div
            role="alert"
            className="p-4 text-sm text-[var(--color-danger)] border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] rounded-md"
          >
            {state.error}
          </div>
        )}

        {state.snapshots.length > 0 && (
          <>
            <section aria-label="Action required">
              <SectionHeader
                icon={Inbox}
                title="Action Required"
                count={inboxCount}
                caption="Items that need your attention"
              />
              <ActionInbox
                snapshots={state.snapshots}
                viewerLogin={viewer.login}
                isDemo={isDemo}
                onMutated={refresh}
              />
            </section>

            <section aria-label="Repository pulse">
              <SectionHeader
                icon={GitBranch}
                title="Repository Pulse"
                count={state.snapshots.length}
                caption="Health of each tracked repo"
                info={<HealthLegend />}
              />
              <RepoPulseGrid snapshots={state.snapshots} />
            </section>

            <section aria-label="Stale watch">
              <SectionHeader
                icon={Hourglass}
                title="Stale Watch"
                count={staleCount}
                caption="Open ≥7d without movement"
              />
              <StaleWatch
                snapshots={state.snapshots}
                isDemo={isDemo}
                onMutated={refresh}
              />
            </section>
          </>
        )}
      </div>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        trackedRepos={trackedRepos}
        isDemo={isDemo}
        onEditRepos={onEditRepos}
        onSignOut={onSignOut}
      />
    </main>
  )
}
