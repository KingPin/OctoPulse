import { ExternalLink, GitPullRequest, MessageSquare } from 'lucide-react'
import { CATEGORY_META, type InboxItem } from './categorize'

interface Props {
  item: InboxItem
}

const TONE_CLASS: Record<
  'accent' | 'danger' | 'attention' | 'success',
  string
> = {
  accent:
    'bg-[color-mix(in_oklab,var(--color-accent)_15%,transparent)] text-[var(--color-accent)] border-[color-mix(in_oklab,var(--color-accent)_40%,transparent)]',
  danger:
    'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border-[var(--color-danger-border)]',
  attention:
    'bg-[var(--color-attention-bg)] text-[var(--color-attention)] border-[var(--color-attention-border)]',
  success:
    'bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success-border)]',
}

function formatAge(days: number): string {
  if (days === 0) return 'today'
  if (days === 1) return '1d'
  if (days < 30) return `${days}d`
  if (days < 365) return `${Math.floor(days / 30)}mo`
  return `${Math.floor(days / 365)}y`
}

export function InboxRow({ item }: Props) {
  const meta = CATEGORY_META[item.category]
  const Icon = item.isPullRequest ? GitPullRequest : MessageSquare

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 px-3 py-2 border-t border-[var(--color-border-muted)] first:border-t-0 hover:bg-[var(--color-canvas-subtle)]"
    >
      <span
        className={`shrink-0 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border ${TONE_CLASS[meta.tone]}`}
      >
        {meta.label}
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

      <span className="text-xs text-[var(--color-fg-subtle)] shrink-0">
        {formatAge(item.ageDays)}
      </span>

      <ExternalLink
        className="w-3.5 h-3.5 text-[var(--color-fg-subtle)] opacity-0 group-hover:opacity-100 shrink-0"
        aria-hidden
      />
    </a>
  )
}
