import {
  Check,
  ExternalLink,
  GitMerge,
  GitPullRequest,
  Loader2,
  MessageSquare,
  Sparkles,
  X,
} from 'lucide-react'
import { CATEGORY_META, type InboxItem } from './categorize'
import { ToneChip } from '@/components/llm/ToneChip'
import type { ClassificationState } from '@/hooks/useClassifications'

interface Props {
  item: InboxItem
  canAct: boolean
  isBusy: boolean
  onAct: () => void
  canSummarize: boolean
  onSummarize: () => void
  classification: ClassificationState | undefined
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

export function InboxRow({
  item,
  canAct,
  isBusy,
  onAct,
  canSummarize,
  onSummarize,
  classification,
}: Props) {
  const meta = CATEGORY_META[item.category]
  const Icon = item.isPullRequest ? GitPullRequest : MessageSquare
  const ActionIcon = item.isPullRequest ? GitMerge : X
  const actionLabel = item.isPullRequest ? 'Merge' : 'Close'

  return (
    <div className="group flex items-center gap-3 px-3 py-2 border-t border-[var(--color-border-muted)] first:border-t-0 hover:bg-[var(--color-canvas-subtle)]">
      <span
        className={`shrink-0 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border ${TONE_CLASS[meta.tone]}`}
      >
        {meta.label}
      </span>

      <Icon
        className="w-3.5 h-3.5 text-[var(--color-fg-muted)] shrink-0"
        aria-hidden
      />

      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 min-w-0 flex items-baseline gap-2 hover:underline"
      >
        <span className="font-mono text-xs text-[var(--color-fg-muted)] shrink-0">
          {item.repoNameWithOwner}#{item.number}
        </span>
        {classification && classification !== 'loading' && (
          <ToneChip intent={classification} />
        )}
        <span className="truncate text-sm">{item.title}</span>
        <ExternalLink
          className="w-3 h-3 text-[var(--color-fg-subtle)] opacity-0 group-hover:opacity-100 shrink-0"
          aria-hidden
        />
      </a>

      <span className="text-xs text-[var(--color-fg-subtle)] shrink-0">
        {formatAge(item.ageDays)}
      </span>

      {canSummarize && (
        <button
          type="button"
          onClick={onSummarize}
          aria-label={`Summarize ${item.repoNameWithOwner}#${item.number}`}
          className="shrink-0 min-h-[28px] inline-flex items-center justify-center px-2 text-xs border border-[var(--color-border)] rounded-md text-[var(--color-fg-muted)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]"
        >
          <Sparkles className="w-3 h-3" aria-hidden />
        </button>
      )}

      {canAct && (
        <button
          type="button"
          onClick={onAct}
          disabled={isBusy}
          aria-label={`${actionLabel} ${item.repoNameWithOwner}#${item.number}`}
          className="shrink-0 min-h-[28px] inline-flex items-center gap-1 px-2 text-xs border border-[var(--color-border)] rounded-md text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] hover:border-[var(--color-accent)] disabled:opacity-50"
        >
          {isBusy ? (
            <Loader2 className="w-3 h-3 animate-spin" aria-hidden />
          ) : item.isPullRequest ? (
            <ActionIcon className="w-3 h-3" aria-hidden />
          ) : (
            <Check className="w-3 h-3" aria-hidden />
          )}
          {actionLabel}
        </button>
      )}
    </div>
  )
}
