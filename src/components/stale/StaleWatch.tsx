import { useEffect, useMemo, useState } from 'react'
import {
  Bot,
  ExternalLink,
  GitPullRequest,
  Hourglass,
  Loader2,
  MessageSquare,
  X,
} from 'lucide-react'
import { staleWatch, type StaleItem, type StaleLevel } from './staleness'
import { ConfirmModal } from '@/components/shell/ConfirmModal'
import { closeIssue, mergePullRequest } from '@/lib/github/mutations'
import { toast } from '@/hooks/useToast'
import * as storage from '@/lib/storage'
import type { RepoSnapshot } from '@/types/github'

interface Props {
  snapshots: RepoSnapshot[]
  isDemo: boolean
  onMutated: () => void
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

interface RowProps {
  item: StaleItem
  selected: boolean
  onToggle: (id: string) => void
}

function Row({ item, selected, onToggle }: RowProps) {
  const Icon = item.isPullRequest ? GitPullRequest : MessageSquare
  return (
    <div
      className={`group flex items-center gap-2 px-3 py-2 border-l-4 border-t border-r border-b border-[var(--color-border-muted)] first:rounded-t-md last:rounded-b-md ${LEVEL_BORDER[item.level]} ${selected ? 'ring-1 ring-inset ring-[var(--color-accent)]' : ''}`}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggle(item.id)}
        aria-label={`Select ${item.repoNameWithOwner}#${item.number}`}
        className="shrink-0 accent-[var(--color-accent)]"
      />
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 min-w-0 flex items-center gap-3 hover:brightness-110"
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
        {item.isBotAuthored && (
          <Bot
            className="w-3.5 h-3.5 text-[var(--color-fg-subtle)] shrink-0"
            aria-label="Bot-authored"
          />
        )}
        <span
          className={`text-xs font-mono shrink-0 ${LEVEL_TEXT[item.level]}`}
        >
          {item.daysQuiet}d<span className="hidden sm:inline"> quiet</span>
        </span>
        <ExternalLink
          className="w-3.5 h-3.5 text-[var(--color-fg-subtle)] opacity-0 group-hover:opacity-100 shrink-0"
          aria-hidden
        />
      </a>
    </div>
  )
}

function parseRepo(nameWithOwner: string): { owner: string; name: string } | null {
  const idx = nameWithOwner.indexOf('/')
  if (idx < 1 || idx === nameWithOwner.length - 1) return null
  return {
    owner: nameWithOwner.slice(0, idx),
    name: nameWithOwner.slice(idx + 1),
  }
}

export function StaleWatch({ snapshots, isDemo, onMutated }: Props) {
  const allItems = useMemo(() => staleWatch(snapshots), [snapshots])
  const [hideBots, setHideBots] = useState<boolean>(
    () => storage.get<boolean>('hideStaleBots') ?? false,
  )
  useEffect(() => {
    storage.set('hideStaleBots', hideBots)
  }, [hideBots])

  const botCount = useMemo(
    () => allItems.filter((i) => i.isBotAuthored).length,
    [allItems],
  )
  const items = useMemo(
    () => (hideBots ? allItems.filter((i) => !i.isBotAuthored) : allItems),
    [allItems, hideBots],
  )

  const [selected, setSelected] = useState<Set<string>>(new Set())
  useEffect(() => {
    setSelected((prev) => {
      const visible = new Set(items.map((i) => i.id))
      const next = new Set<string>()
      for (const id of prev) if (visible.has(id)) next.add(id)
      return next.size === prev.size ? prev : next
    })
  }, [items])

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedItems = useMemo(
    () => items.filter((i) => selected.has(i.id)),
    [items, selected],
  )
  const selectedPRs = selectedItems.filter((i) => i.isPullRequest)
  const selectedIssues = selectedItems.filter((i) => !i.isPullRequest)

  const runBatch = async () => {
    if (isDemo) {
      toast('Demo mode — no real API calls made', 'info')
      setConfirmOpen(false)
      setSelected(new Set())
      return
    }
    setBusy(true)
    let ok = 0
    let failed = 0
    for (const item of selectedItems) {
      const parsed = parseRepo(item.repoNameWithOwner)
      if (!parsed) {
        failed += 1
        continue
      }
      try {
        if (item.isPullRequest) {
          await mergePullRequest(parsed.owner, parsed.name, item.number)
        } else {
          await closeIssue(parsed.owner, parsed.name, item.number)
        }
        ok += 1
      } catch (e) {
        failed += 1
        const msg = e instanceof Error ? e.message : 'failed'
        toast(`${item.repoNameWithOwner}#${item.number}: ${msg}`, 'error')
      }
    }
    setBusy(false)
    setConfirmOpen(false)
    setSelected(new Set())
    if (failed === 0) {
      toast(`Resolved ${ok} item${ok === 1 ? '' : 's'}`, 'success')
    } else {
      toast(`Resolved ${ok}, ${failed} failed`, ok > 0 ? 'info' : 'error')
    }
    onMutated()
  }

  if (allItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-8 border border-dashed border-[var(--color-border)] rounded-md text-[var(--color-fg-muted)]">
        <Hourglass className="w-6 h-6 text-[var(--color-success)]" aria-hidden />
        <p className="text-sm">No stale threads — everything has moved in the last 7 days.</p>
      </div>
    )
  }

  const hasSelection = selected.size > 0

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        {botCount > 0 && (
          <label className="flex items-center gap-2 text-xs text-[var(--color-fg-muted)] cursor-pointer">
            <input
              type="checkbox"
              checked={hideBots}
              onChange={(e) => setHideBots(e.target.checked)}
              className="accent-[var(--color-accent)]"
            />
            <Bot className="w-3.5 h-3.5" aria-hidden />
            Hide dependency bots
            <span className="font-mono text-[var(--color-fg-subtle)]">
              ({botCount})
            </span>
          </label>
        )}
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (selected.size === items.length) setSelected(new Set())
              else setSelected(new Set(items.map((i) => i.id)))
            }}
            className="text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] underline-offset-2 hover:underline"
          >
            {selected.size === items.length ? 'Clear selection' : 'Select all'}
          </button>
        )}
      </div>

      {hasSelection && (
        <div className="sticky top-[57px] z-10 flex flex-wrap items-center justify-between gap-2 px-3 py-2 border border-[var(--color-accent)] bg-[var(--color-canvas-subtle)] rounded-md shadow-sm">
          <div className="text-xs text-[var(--color-fg-muted)]">
            <span className="font-semibold text-[var(--color-fg-default)]">
              {selected.size}
            </span>{' '}
            selected
            {selectedPRs.length > 0 && ` · ${selectedPRs.length} PR${selectedPRs.length === 1 ? '' : 's'} to merge`}
            {selectedIssues.length > 0 && ` · ${selectedIssues.length} issue${selectedIssues.length === 1 ? '' : 's'} to close`}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="min-h-[32px] flex items-center gap-1 px-2 text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)]"
            >
              <X className="w-3.5 h-3.5" aria-hidden />
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="min-h-[32px] px-3 text-xs font-medium border border-[var(--color-accent)] bg-[var(--color-accent)] text-white rounded-md hover:brightness-110"
            >
              Resolve {selected.size}
            </button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 p-8 border border-dashed border-[var(--color-border)] rounded-md text-[var(--color-fg-muted)]">
          <Hourglass className="w-6 h-6 text-[var(--color-success)]" aria-hidden />
          <p className="text-sm">
            All remaining stale items are from dependency bots — toggle the
            filter off to see them.
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {items.map((item) => (
            <Row
              key={item.id}
              item={item}
              selected={selected.has(item.id)}
              onToggle={toggle}
            />
          ))}
        </div>
      )}

      <ConfirmModal
        open={confirmOpen}
        title={`Resolve ${selected.size} stale item${selected.size === 1 ? '' : 's'}?`}
        description={[
          selectedPRs.length > 0 &&
            `${selectedPRs.length} PR${selectedPRs.length === 1 ? '' : 's'} will be merged with the default merge method.`,
          selectedIssues.length > 0 &&
            `${selectedIssues.length} issue${selectedIssues.length === 1 ? '' : 's'} will be closed without comment.`,
          'You can reopen issues on GitHub. Make sure required checks pass on PRs.',
        ]
          .filter(Boolean)
          .join(' ')}
        confirmLabel={busy ? 'Working…' : `Resolve ${selected.size}`}
        variant="danger"
        busy={busy}
        onConfirm={runBatch}
        onCancel={() => !busy && setConfirmOpen(false)}
      />

      {busy && (
        <div className="flex items-center gap-2 text-xs text-[var(--color-fg-muted)]">
          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
          Processing batch…
        </div>
      )}
    </div>
  )
}
