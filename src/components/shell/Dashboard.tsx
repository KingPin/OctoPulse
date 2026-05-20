import { useMemo, useState } from 'react'
import { Inbox, GitBranch, Hourglass, Loader2 } from 'lucide-react'
import { TopBar } from './TopBar'
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
}

interface SectionHeaderProps {
  icon: typeof Inbox
  title: string
  count?: number
  caption?: string
}

function SectionHeader({ icon: Icon, title, count, caption }: SectionHeaderProps) {
  return (
    <div className="flex items-baseline justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon
          className="w-4 h-4 text-[var(--color-fg-muted)]"
          aria-hidden
        />
        <h2 className="text-base font-semibold">{title}</h2>
        {typeof count === 'number' && (
          <span className="text-xs font-mono text-[var(--color-fg-muted)] px-1.5 py-0.5 border border-[var(--color-border)] rounded-md">
            {count}
          </span>
        )}
      </div>
      {caption && (
        <span className="text-xs text-[var(--color-fg-subtle)]">{caption}</span>
      )}
    </div>
  )
}

export function Dashboard({ viewer, isDemo, trackedRepos, onSignOut }: Props) {
  const { state, refresh } = useDashboardData({ trackedRepos, isDemo })
  const [, setSettingsOpen] = useState(false)
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
        onRefresh={refresh}
        onOpenSettings={() => setSettingsOpen(true)}
        onSignOut={onSignOut}
      />

      <div className="flex-1 max-w-6xl w-full mx-auto px-6 py-6 flex flex-col gap-10">
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
              />
            </section>

            <section aria-label="Repository pulse">
              <SectionHeader
                icon={GitBranch}
                title="Repository Pulse"
                count={state.snapshots.length}
                caption="Health of each tracked repo"
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
              <StaleWatch snapshots={state.snapshots} />
            </section>
          </>
        )}
      </div>
    </main>
  )
}
