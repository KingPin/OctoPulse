import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleDot,
  Globe,
  GitBranch,
  HelpCircle,
  Hourglass,
  Inbox,
  Loader2,
  Lock,
} from 'lucide-react'
import { TopBar } from './TopBar'
import { SettingsPanel } from './SettingsPanel'
import { CommandPalette, useCommandPaletteShortcut } from './CommandPalette'
import { useDashboardData } from '@/hooks/useDashboardData'
import { ActionInbox } from '@/components/inbox/ActionInbox'
import { categorize } from '@/components/inbox/categorize'
import { RepoPulseGrid } from '@/components/pulse/RepoPulseGrid'
import { StaleWatch } from '@/components/stale/StaleWatch'
import { staleWatch } from '@/components/stale/staleness'
import * as storage from '@/lib/storage'
import type { TrackedRepo } from '@/hooks/useRepos'
import type { Viewer } from '@/lib/github/types'
import type { RepoSnapshot } from '@/types/github'

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
  collapsed?: boolean
  onToggle?: () => void
  controlsId?: string
}

function SectionHeader({
  icon: Icon,
  title,
  count,
  caption,
  info,
  collapsed,
  onToggle,
  controlsId,
}: SectionHeaderProps) {
  const collapsible = typeof onToggle === 'function'
  const titleRow = (
    <>
      {collapsible && (
        <ChevronRight
          className={`w-3.5 h-3.5 text-[var(--color-fg-subtle)] transition-transform ${
            collapsed ? '' : 'rotate-90'
          }`}
          aria-hidden
        />
      )}
      <Icon className="w-4 h-4 text-[var(--color-fg-muted)]" aria-hidden />
      <h2 className="text-base font-semibold">{title}</h2>
      {typeof count === 'number' && (
        <span className="text-xs font-mono text-[var(--color-fg-subtle)] px-1.5 py-0.5 bg-[var(--color-canvas-subtle)] rounded-md">
          {count}
        </span>
      )}
    </>
  )
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 ${
        collapsed ? '' : 'mb-3'
      }`}
    >
      <div className="flex items-center gap-2">
        {collapsible ? (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={!collapsed}
            aria-controls={controlsId}
            className="flex items-center gap-2 -ml-1 px-1 py-0.5 rounded hover:bg-[var(--color-canvas-subtle)] text-left"
          >
            {titleRow}
          </button>
        ) : (
          titleRow
        )}
        {info}
      </div>
      {caption && !collapsed && (
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

type Visibility = 'all' | 'public' | 'private'
type SectionKey = 'inbox' | 'pulse' | 'stale'

const VISIBILITY_OPTIONS: { value: Visibility; label: string; Icon: typeof Globe }[] = [
  { value: 'all', label: 'All', Icon: GitBranch },
  { value: 'public', label: 'Public', Icon: Globe },
  { value: 'private', label: 'Private', Icon: Lock },
]

interface VisibilityFilterProps {
  value: Visibility
  onChange: (v: Visibility) => void
  counts: Record<Visibility, number>
}

function VisibilityFilter({ value, onChange, counts }: VisibilityFilterProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Filter by visibility"
      className="flex items-center gap-1 p-0.5 border border-[var(--color-border)] bg-[var(--color-canvas-subtle)] rounded-md text-xs"
    >
      {VISIBILITY_OPTIONS.map(({ value: v, label, Icon }) => {
        const active = v === value
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(v)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded ${
              active
                ? 'bg-[var(--color-canvas)] text-[var(--color-fg-default)] shadow-sm'
                : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)]'
            }`}
          >
            <Icon className="w-3 h-3" aria-hidden />
            <span>{label}</span>
            <span className="font-mono text-[10px] text-[var(--color-fg-subtle)]">
              {counts[v]}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function applyVisibility(
  snapshots: RepoSnapshot[],
  visibility: Visibility,
): RepoSnapshot[] {
  if (visibility === 'all') return snapshots
  if (visibility === 'private') return snapshots.filter((r) => r.isPrivate)
  return snapshots.filter((r) => !r.isPrivate)
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
  const [paletteOpen, setPaletteOpen] = useState(false)
  useCommandPaletteShortcut(() => setPaletteOpen(true))
  const [visibility, setVisibilityState] = useState<Visibility>(
    () => storage.get<Visibility>('visibilityFilter') ?? 'all',
  )
  const setVisibility = (v: Visibility) => {
    setVisibilityState(v)
    storage.set<Visibility>('visibilityFilter', v)
  }
  const visibilityCounts = useMemo<Record<Visibility, number>>(() => {
    const priv = state.snapshots.filter((r) => r.isPrivate).length
    return {
      all: state.snapshots.length,
      public: state.snapshots.length - priv,
      private: priv,
    }
  }, [state.snapshots])
  const filteredSnapshots = useMemo(
    () => applyVisibility(state.snapshots, visibility),
    [state.snapshots, visibility],
  )
  const inboxCount = useMemo(
    () => categorize(filteredSnapshots, viewer.login).length,
    [filteredSnapshots, viewer.login],
  )
  const staleCount = useMemo(
    () => staleWatch(filteredSnapshots).length,
    [filteredSnapshots],
  )

  const [collapsed, setCollapsedState] = useState<Record<SectionKey, boolean>>(
    () => ({
      inbox: false,
      pulse: false,
      stale: false,
      ...(storage.get<Partial<Record<SectionKey, boolean>>>('collapsedSections') ?? {}),
    }),
  )
  const toggleSection = (key: SectionKey) => {
    setCollapsedState((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      storage.set('collapsedSections', next)
      return next
    })
  }

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
        onOpenPalette={() => setPaletteOpen(true)}
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
            {(visibilityCounts.public > 0 && visibilityCounts.private > 0) && (
              <div className="-mb-6 flex items-center gap-2">
                <VisibilityFilter
                  value={visibility}
                  onChange={setVisibility}
                  counts={visibilityCounts}
                />
              </div>
            )}

            {filteredSnapshots.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 p-8 border border-dashed border-[var(--color-border)] rounded-md text-[var(--color-fg-muted)]">
                <p className="text-sm">
                  No {visibility} repos in your tracked list.
                </p>
                <button
                  type="button"
                  onClick={() => setVisibility('all')}
                  className="text-xs px-2 py-1 border border-[var(--color-border)] rounded-md hover:text-[var(--color-fg-default)]"
                >
                  Show all
                </button>
              </div>
            ) : (
              <>
                <section aria-label="Action required">
                  <SectionHeader
                    icon={Inbox}
                    title="Action Required"
                    count={inboxCount}
                    caption="Items that need your attention"
                    collapsed={collapsed.inbox}
                    onToggle={() => toggleSection('inbox')}
                    controlsId="section-inbox"
                  />
                  {!collapsed.inbox && (
                    <div id="section-inbox">
                      <ActionInbox
                        snapshots={filteredSnapshots}
                        viewerLogin={viewer.login}
                        isDemo={isDemo}
                        onMutated={refresh}
                      />
                    </div>
                  )}
                </section>

                <section aria-label="Repository pulse">
                  <SectionHeader
                    icon={GitBranch}
                    title="Repository Pulse"
                    count={filteredSnapshots.length}
                    caption="Health of each tracked repo"
                    info={<HealthLegend />}
                    collapsed={collapsed.pulse}
                    onToggle={() => toggleSection('pulse')}
                    controlsId="section-pulse"
                  />
                  {!collapsed.pulse && (
                    <div id="section-pulse">
                      <RepoPulseGrid snapshots={filteredSnapshots} />
                    </div>
                  )}
                </section>

                <section aria-label="Stale watch">
                  <SectionHeader
                    icon={Hourglass}
                    title="Stale Watch"
                    count={staleCount}
                    caption="Open ≥7d without movement"
                    collapsed={collapsed.stale}
                    onToggle={() => toggleSection('stale')}
                    controlsId="section-stale"
                  />
                  {!collapsed.stale && (
                    <div id="section-stale">
                      <StaleWatch
                        snapshots={filteredSnapshots}
                        isDemo={isDemo}
                        onMutated={refresh}
                      />
                    </div>
                  )}
                </section>
              </>
            )}
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

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        snapshots={state.snapshots}
      />
    </main>
  )
}
