import { useMemo, useState } from 'react'
import { RepoCard } from './RepoCard'
import { computeHealth, type Health } from './health'
import type { RepoSnapshot } from '@/types/github'

interface Props {
  snapshots: RepoSnapshot[]
}

type Filter = 'all' | Health

const HEALTH_ORDER: Record<Health, number> = { red: 0, amber: 1, green: 2 }

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'red', label: 'Needs attention' },
  { value: 'amber', label: 'Stale' },
  { value: 'green', label: 'Healthy' },
]

const FILTER_ACTIVE_CLS: Record<Filter, string> = {
  all: 'bg-[var(--color-fg-muted)] text-[var(--color-canvas)] border-[var(--color-fg-muted)]',
  red: 'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border-[var(--color-danger-border)]',
  amber: 'bg-[var(--color-attention-bg)] text-[var(--color-attention)] border-[var(--color-attention-border)]',
  green: 'bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success-border)]',
}

export function RepoPulseGrid({ snapshots }: Props) {
  const [filter, setFilter] = useState<Filter>('all')

  const decorated = useMemo(
    () =>
      snapshots
        .map((repo) => ({ repo, health: computeHealth(repo) }))
        .sort((a, b) => {
          const byHealth = HEALTH_ORDER[a.health] - HEALTH_ORDER[b.health]
          if (byHealth !== 0) return byHealth
          return a.repo.nameWithOwner.localeCompare(b.repo.nameWithOwner)
        }),
    [snapshots],
  )

  const counts = useMemo(() => {
    const c: Record<Health, number> = { red: 0, amber: 0, green: 0 }
    for (const { health } of decorated) c[health] += 1
    return c
  }, [decorated])

  const visible = useMemo(
    () =>
      filter === 'all' ? decorated : decorated.filter((d) => d.health === filter),
    [decorated, filter],
  )

  if (snapshots.length === 0) {
    return (
      <div className="p-6 text-sm text-[var(--color-fg-muted)] border border-dashed border-[var(--color-border)] rounded-md text-center">
        No repos tracked yet.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter repos by health">
        {FILTERS.map(({ value, label }) => {
          const count =
            value === 'all'
              ? decorated.length
              : counts[value]
          const active = filter === value
          const cls = active
            ? FILTER_ACTIVE_CLS[value]
            : 'border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)]'
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(value)}
              disabled={count === 0 && !active}
              className={`px-2.5 py-1 text-xs border rounded-full transition-colors disabled:opacity-40 ${cls}`}
            >
              {label} <span className="font-mono">{count}</span>
            </button>
          )
        })}
      </div>

      {visible.length === 0 ? (
        <div className="p-6 text-sm text-[var(--color-fg-muted)] border border-dashed border-[var(--color-border)] rounded-md text-center">
          No repos match this filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {visible.map(({ repo }) => (
            <RepoCard key={repo.id} repo={repo} />
          ))}
        </div>
      )}
    </div>
  )
}
