import { useEffect, useMemo, useRef, useState } from 'react'
import { GitBranch, Hourglass, Search, X } from 'lucide-react'
import { staleWatch } from '@/components/stale/staleness'
import type { RepoSnapshot } from '@/types/github'

interface Props {
  open: boolean
  onClose: () => void
  snapshots: RepoSnapshot[]
}

type Entry =
  | {
      kind: 'repo'
      id: string
      label: string
      sub: string | null
      url: string
    }
  | {
      kind: 'thread'
      id: string
      label: string
      sub: string
      url: string
    }

function isMac(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Mac|iPhone|iPad/.test(navigator.platform)
}

function buildEntries(snapshots: RepoSnapshot[]): Entry[] {
  const repos: Entry[] = snapshots
    .map((r) => ({
      kind: 'repo' as const,
      id: `repo:${r.id}`,
      label: r.nameWithOwner,
      sub: r.description,
      url: r.url,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
  const threads: Entry[] = staleWatch(snapshots).map((s) => ({
    kind: 'thread' as const,
    id: s.id,
    label: `${s.repoNameWithOwner}#${s.number}`,
    sub: s.title,
    url: s.url,
  }))
  return [...repos, ...threads]
}

function matches(entry: Entry, q: string): boolean {
  if (!q) return true
  const needle = q.toLowerCase()
  if (entry.label.toLowerCase().includes(needle)) return true
  if (entry.sub && entry.sub.toLowerCase().includes(needle)) return true
  return false
}

export function CommandPalette({ open, onClose, snapshots }: Props) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const listRef = useRef<HTMLUListElement | null>(null)

  const entries = useMemo(() => buildEntries(snapshots), [snapshots])
  const filtered = useMemo(
    () => entries.filter((e) => matches(e, query)).slice(0, 50),
    [entries, query],
  )

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(0)
    const id = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [open])

  useEffect(() => {
    setActive(0)
  }, [query])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActive((i) => Math.min(filtered.length - 1, i + 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActive((i) => Math.max(0, i - 1))
      } else if (e.key === 'Enter') {
        const entry = filtered[active]
        if (entry) {
          window.open(entry.url, '_blank', 'noopener,noreferrer')
          onClose()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, filtered, active, onClose])

  useEffect(() => {
    if (!open || !listRef.current) return
    const el = listRef.current.querySelector<HTMLLIElement>(
      `[data-idx="${active}"]`,
    )
    el?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quick filter"
      className="fixed inset-0 z-40 flex items-start justify-center p-4 pt-[10vh]"
    >
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-xl bg-[var(--color-canvas)] border border-[var(--color-border)] rounded-md shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-3 border-b border-[var(--color-border-muted)]">
          <Search className="w-4 h-4 text-[var(--color-fg-muted)]" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter repos and stale items…"
            className="flex-1 min-h-[44px] bg-transparent outline-none text-sm"
          />
          <kbd className="hidden sm:inline text-[10px] font-mono text-[var(--color-fg-subtle)] px-1.5 py-0.5 border border-[var(--color-border)] rounded">
            Esc
          </kbd>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="sm:hidden p-1 text-[var(--color-fg-muted)]"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>
        <ul
          ref={listRef}
          role="listbox"
          className="max-h-[50vh] overflow-y-auto"
        >
          {filtered.length === 0 ? (
            <li className="px-4 py-6 text-sm text-[var(--color-fg-muted)] text-center">
              No matches.
            </li>
          ) : (
            filtered.map((entry, idx) => {
              const Icon = entry.kind === 'repo' ? GitBranch : Hourglass
              const isActive = idx === active
              return (
                <li key={entry.id} data-idx={idx}>
                  <a
                    href={entry.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => onClose()}
                    role="option"
                    aria-selected={isActive}
                    className={`flex items-center gap-3 px-3 py-2 text-sm ${isActive ? 'bg-[var(--color-canvas-subtle)]' : ''}`}
                  >
                    <Icon
                      className="w-3.5 h-3.5 text-[var(--color-fg-muted)] shrink-0"
                      aria-hidden
                    />
                    <span className="font-mono text-xs text-[var(--color-fg-muted)] shrink-0">
                      {entry.label}
                    </span>
                    {entry.sub && (
                      <span className="truncate text-[var(--color-fg-default)]">
                        {entry.sub}
                      </span>
                    )}
                  </a>
                </li>
              )
            })
          )}
        </ul>
        <div className="flex items-center justify-between gap-3 px-3 py-2 border-t border-[var(--color-border-muted)] text-[11px] text-[var(--color-fg-subtle)]">
          <span>
            ↑↓ to navigate · Enter to open in new tab
          </span>
          <span>
            {filtered.length} of {entries.length}
          </span>
        </div>
      </div>
    </div>
  )
}

export function useCommandPaletteShortcut(onOpen: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = isMac() ? e.metaKey : e.ctrlKey
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onOpen()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onOpen])
}
