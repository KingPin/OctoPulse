import { useMemo } from 'react'
import {
  ExternalLink,
  GitPullRequest,
  Hourglass,
  MessageSquare,
} from 'lucide-react'
import { staleWatch, type StaleItem, type StaleLevel } from './staleness'
import type { RepoSnapshot } from '@/types/github'

interface Props {
  snapshots: RepoSnapshot[]
}

const LEVEL_BORDER: Record<StaleLevel, string> = {
  amber:
    'border-l-[var(--color-attention)] bg-[color-mix(in_oklab,var(--color-attention-bg)_50%,transparent)]',
  red: 'border-l-[var(--color-danger)] bg-[color-mix(in_oklab,var(--color-danger-bg)_50%,transparent)]',
}

const LEVEL_LABEL: Record<StaleLevel, string> = {
  amber: 'Quiet',
  red: 'Stalled',
}

const LEVEL_TEXT: Record<StaleLevel, string> = {
  amber: 'text-[var(--color-attention)]',
  red: 'text-[var(--color-danger)]',
}

function Row({ item }: { item: StaleItem }) {
  const Icon = item.isPullRequest ? GitPullRequest : MessageSquare
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex items-center gap-3 px-3 py-2 border-l-4 border-t border-r border-b border-[var(--color-border-muted)] first:rounded-t-md last:rounded-b-md hover:brightness-110 ${LEVEL_BORDER[item.level]}`}
    >
      <span
        className={`shrink-0 text-[10px] uppercase tracking-wider font-semibold ${LEVEL_TEXT[item.level]}`}
      >
        {LEVEL_LABEL[item.level]}
      </span>
      <Icon
        className="w-3.5 h-3.5 text-[var(--color-fg-muted)] shrink-0"
        aria-hidden
      />
      <div className="flex-1 min-w-0 flex items-baseline gap-2">
        <span className="font-mono text-xs text-[var(--color-fg-muted)] shrink-0">
          {item.repoNameWithOwner}#{item.number}
        </span>
        <span className="truncate text-sm">{item.title}</span>
      </div>
      <span
        className={`text-xs font-mono shrink-0 ${LEVEL_TEXT[item.level]}`}
      >
        {item.daysQuiet}d quiet
      </span>
      <ExternalLink
        className="w-3.5 h-3.5 text-[var(--color-fg-subtle)] opacity-0 group-hover:opacity-100 shrink-0"
        aria-hidden
      />
    </a>
  )
}

export function StaleWatch({ snapshots }: Props) {
  const items = useMemo(() => staleWatch(snapshots), [snapshots])

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-8 border border-dashed border-[var(--color-border)] rounded-md text-[var(--color-fg-muted)]">
        <Hourglass className="w-6 h-6 text-[var(--color-success)]" aria-hidden />
        <p className="text-sm">No stale threads — everything has moved in the last 7 days.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {items.map((item) => (
        <Row key={item.id} item={item} />
      ))}
    </div>
  )
}
