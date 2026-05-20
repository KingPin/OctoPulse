import {
  CircleAlert,
  CircleCheck,
  CircleDot,
  GitFork,
  Lock,
  ExternalLink,
  Tag,
} from 'lucide-react'
import type { RepoSnapshot } from '@/types/github'
import { computeHealth, type Health } from './health'

interface Props {
  repo: RepoSnapshot
}

const DAY_MS = 24 * 60 * 60 * 1000

function formatAge(iso: string | null | undefined): string {
  if (!iso) return '—'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS)
  if (days === 0) return 'today'
  if (days === 1) return '1d ago'
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

const HEALTH_RING: Record<Health, string> = {
  green: 'border-l-[var(--color-success)]',
  amber: 'border-l-[var(--color-attention)]',
  red: 'border-l-[var(--color-danger)]',
}

const HEALTH_ICON: Record<Health, typeof CircleCheck> = {
  green: CircleCheck,
  amber: CircleDot,
  red: CircleAlert,
}

const HEALTH_COLOR: Record<Health, string> = {
  green: 'text-[var(--color-success)]',
  amber: 'text-[var(--color-attention)]',
  red: 'text-[var(--color-danger)]',
}

const HEALTH_LABEL: Record<Health, string> = {
  green: 'Healthy',
  amber: 'Stale',
  red: 'Needs attention',
}

export function RepoCard({ repo }: Props) {
  const health = computeHealth(repo)
  const Icon = HEALTH_ICON[health]
  const lastRelease = repo.releases.nodes[0]
  const checkState = repo.defaultBranchRef?.target?.statusCheckRollup?.state

  return (
    <a
      href={repo.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex flex-col gap-3 p-4 border border-[var(--color-border)] border-l-4 ${HEALTH_RING[health]} rounded-md bg-[var(--color-canvas-subtle)] hover:border-[var(--color-fg-muted)] transition-colors`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`flex items-center gap-1 text-xs ${HEALTH_COLOR[health]}`}
            title={HEALTH_LABEL[health]}
          >
            <Icon className="w-3.5 h-3.5" aria-hidden />
          </span>
          <span className="font-mono text-sm font-semibold truncate">
            {repo.nameWithOwner}
          </span>
        </div>
        <ExternalLink
          className="w-3.5 h-3.5 text-[var(--color-fg-subtle)] opacity-0 group-hover:opacity-100 shrink-0"
          aria-hidden
        />
      </div>

      <div className="flex flex-wrap gap-1">
        {repo.isPrivate && (
          <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-[var(--color-border)] text-[var(--color-fg-muted)]">
            <Lock className="w-3 h-3" aria-hidden /> Private
          </span>
        )}
        {repo.isFork && (
          <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-[var(--color-border)] text-[var(--color-fg-muted)]">
            <GitFork className="w-3 h-3" aria-hidden /> Fork
          </span>
        )}
        {repo.isArchived && (
          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-[var(--color-border)] text-[var(--color-fg-muted)]">
            Archived
          </span>
        )}
      </div>

      {repo.description && (
        <p className="text-xs text-[var(--color-fg-muted)] line-clamp-2">
          {repo.description}
        </p>
      )}

      <dl className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-[var(--color-fg-subtle)] uppercase text-[10px] tracking-wider">
            Issues
          </dt>
          <dd className="font-mono">{repo.issues.totalCount}</dd>
        </div>
        <div>
          <dt className="text-[var(--color-fg-subtle)] uppercase text-[10px] tracking-wider">
            PRs
          </dt>
          <dd className="font-mono">{repo.pullRequests.totalCount}</dd>
        </div>
        <div>
          <dt className="text-[var(--color-fg-subtle)] uppercase text-[10px] tracking-wider">
            Active
          </dt>
          <dd className="font-mono">{formatAge(repo.pushedAt)}</dd>
        </div>
      </dl>

      <div className="flex items-center justify-between text-[10px] text-[var(--color-fg-subtle)] uppercase tracking-wider">
        {lastRelease ? (
          <span className="flex items-center gap-1">
            <Tag className="w-3 h-3" aria-hidden />
            {lastRelease.tagName}
          </span>
        ) : (
          <span>No releases</span>
        )}
        <span className={checkState && checkState !== 'SUCCESS' ? 'text-[var(--color-danger)]' : ''}>
          main: {checkState ?? '—'}
        </span>
      </div>
    </a>
  )
}
