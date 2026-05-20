import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Activity, Loader2, Plus, Search, X, AlertTriangle } from 'lucide-react'
import { fetchViewerRepos, type ViewerRepo } from '@/lib/github/viewer'
import { type TrackedRepo, REPO_SOFT_CAP } from '@/hooks/useRepos'
import { toast } from '@/hooks/useToast'

interface Props {
  onContinue: (repos: TrackedRepo[]) => void
  onSignOut: () => void
}

const DAY_MS = 24 * 60 * 60 * 1000
const RECENT_PUSH_DAYS = 90
const OWNER_REPO_PATTERN =
  /^([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+?)(?:\.git)?\/?$/

function daysAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS)
}

function formatAge(iso: string): string {
  const d = daysAgo(iso)
  if (d === 0) return 'today'
  if (d === 1) return '1d'
  if (d < 30) return `${d}d`
  if (d < 365) return `${Math.floor(d / 30)}mo`
  return `${Math.floor(d / 365)}y`
}

function parseOwnerRepo(input: string): { owner: string; name: string } | null {
  const trimmed = input.trim().replace(/^https?:\/\/github\.com\//, '')
  const match = trimmed.match(OWNER_REPO_PATTERN)
  if (!match) return null
  return { owner: match[1]!, name: match[2]! }
}

function toTracked(r: ViewerRepo): TrackedRepo {
  return {
    id: r.id,
    nameWithOwner: r.nameWithOwner,
    description: r.description,
    isPrivate: r.isPrivate,
    isFork: r.isFork,
    isArchived: r.isArchived,
    pushedAt: r.pushedAt,
  }
}

export function RepoPicker({ onContinue, onSignOut }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<ViewerRepo[]>([])
  const [selected, setSelected] = useState<Map<string, TrackedRepo>>(new Map())
  const [query, setQuery] = useState('')
  const [externalInput, setExternalInput] = useState('')
  const [showExternalForm, setShowExternalForm] = useState(false)

  useEffect(() => {
    const ac = new AbortController()
    fetchViewerRepos(ac.signal)
      .then((repos) => {
        setCandidates(repos)
        const defaults = new Map<string, TrackedRepo>()
        for (const r of repos) {
          if (!r.isArchived && daysAgo(r.pushedAt) <= RECENT_PUSH_DAYS) {
            defaults.set(r.nameWithOwner, toTracked(r))
          }
        }
        setSelected(defaults)
        setLoading(false)
      })
      .catch((e: unknown) => {
        if (ac.signal.aborted) return
        setError(e instanceof Error ? e.message : 'Failed to load repos')
        setLoading(false)
      })
    return () => ac.abort()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return candidates
    return candidates.filter(
      (r) =>
        r.nameWithOwner.toLowerCase().includes(q) ||
        (r.description?.toLowerCase().includes(q) ?? false),
    )
  }, [candidates, query])

  const selectedList = useMemo(
    () =>
      Array.from(selected.values()).sort((a, b) =>
        a.nameWithOwner.localeCompare(b.nameWithOwner),
      ),
    [selected],
  )
  const overCap = selectedList.length > REPO_SOFT_CAP

  const toggle = (repo: ViewerRepo) => {
    setSelected((prev) => {
      const next = new Map(prev)
      if (next.has(repo.nameWithOwner)) next.delete(repo.nameWithOwner)
      else next.set(repo.nameWithOwner, toTracked(repo))
      return next
    })
  }

  const removeFromSelection = (nameWithOwner: string) => {
    setSelected((prev) => {
      const next = new Map(prev)
      next.delete(nameWithOwner)
      return next
    })
  }

  const addExternal = (e: FormEvent) => {
    e.preventDefault()
    const parsed = parseOwnerRepo(externalInput)
    if (!parsed) {
      toast('Format must be owner/repo', 'error')
      return
    }
    const nameWithOwner = `${parsed.owner}/${parsed.name}`
    if (selected.has(nameWithOwner)) {
      toast(`${nameWithOwner} is already tracked`, 'info')
      setExternalInput('')
      return
    }
    setSelected((prev) => {
      const next = new Map(prev)
      next.set(nameWithOwner, {
        id: nameWithOwner,
        nameWithOwner,
        description: null,
        isPrivate: false,
        isFork: false,
        isArchived: false,
        pushedAt: new Date().toISOString(),
        external: true,
      })
      return next
    })
    setExternalInput('')
    setShowExternalForm(false)
    toast(`Added ${nameWithOwner}`, 'success')
  }

  const handleContinue = () => {
    if (selectedList.length === 0) {
      toast('Pick at least one repo', 'error')
      return
    }
    onContinue(selectedList)
  }

  return (
    <main className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-canvas-subtle)]">
        <div className="flex items-center gap-2">
          <Activity
            className="w-5 h-5 text-[var(--color-accent)]"
            aria-hidden
          />
          <span className="text-sm font-semibold">OctoPulse</span>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="min-h-[36px] px-3 text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] border border-[var(--color-border)] rounded-md"
        >
          Sign out
        </button>
      </header>

      <section className="flex-1 flex justify-center p-6">
        <div className="w-full max-w-3xl flex flex-col gap-5">
          <div>
            <h1 className="text-xl font-semibold">Pick repos to track</h1>
            <p className="text-sm text-[var(--color-fg-muted)] mt-1">
              Pre-selected: repos you&apos;ve pushed to in the last{' '}
              {RECENT_PUSH_DAYS} days. Add others (or paste{' '}
              <code className="font-mono text-xs">owner/repo</code> for external
              OSS).
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span
              className={`px-2 py-0.5 rounded-md font-mono text-xs ${
                overCap
                  ? 'bg-[var(--color-attention-bg)] text-[var(--color-attention)] border border-[var(--color-attention-border)]'
                  : 'bg-[var(--color-canvas-subtle)] text-[var(--color-fg-muted)] border border-[var(--color-border)]'
              }`}
            >
              {selectedList.length} / {REPO_SOFT_CAP} selected
            </span>
            {overCap && (
              <span className="flex items-center gap-1 text-xs text-[var(--color-attention)]">
                <AlertTriangle className="w-3.5 h-3.5" aria-hidden />
                Above soft cap — refreshes may be slow.
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-fg-muted)]"
                aria-hidden
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search repos…"
                className="w-full pl-9 pr-3 py-2 text-sm bg-[var(--color-canvas-subtle)] border border-[var(--color-border)] rounded-md focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowExternalForm((v) => !v)}
              className="flex items-center gap-1 min-h-[40px] px-3 text-sm border border-[var(--color-border)] rounded-md text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] hover:border-[var(--color-fg-muted)]"
            >
              <Plus className="w-4 h-4" aria-hidden />
              Add external
            </button>
          </div>

          {showExternalForm && (
            <form
              onSubmit={addExternal}
              className="flex gap-2 p-3 border border-[var(--color-border)] rounded-md bg-[var(--color-canvas-subtle)]"
            >
              <input
                type="text"
                value={externalInput}
                onChange={(e) => setExternalInput(e.target.value)}
                placeholder="owner/repo or https://github.com/owner/repo"
                className="flex-1 px-3 py-2 text-sm font-mono bg-[var(--color-canvas)] border border-[var(--color-border)] rounded-md focus:outline-none focus:border-[var(--color-accent)]"
                autoFocus
              />
              <button
                type="submit"
                className="min-h-[40px] px-4 text-sm bg-[var(--color-accent)] text-white rounded-md hover:opacity-90"
              >
                Add
              </button>
            </form>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-sm text-[var(--color-fg-muted)] py-8 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              Loading your repos…
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="p-3 text-sm text-[var(--color-danger)] border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] rounded-md"
            >
              {error}
            </div>
          )}

          {!loading && !error && (
            <>
              {selectedList.some((r) => r.external) && (
                <div className="border border-[var(--color-border)] rounded-md overflow-hidden">
                  <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-muted)] bg-[var(--color-canvas-subtle)]">
                    External repos (pasted)
                  </div>
                  <ul>
                    {selectedList
                      .filter((r) => r.external)
                      .map((r) => (
                        <li
                          key={r.nameWithOwner}
                          className="flex items-center justify-between px-3 py-2 border-t border-[var(--color-border-muted)]"
                        >
                          <span className="font-mono text-sm">
                            {r.nameWithOwner}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFromSelection(r.nameWithOwner)}
                            aria-label={`Remove ${r.nameWithOwner}`}
                            className="p-1 text-[var(--color-fg-muted)] hover:text-[var(--color-danger)]"
                          >
                            <X className="w-4 h-4" aria-hidden />
                          </button>
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              <div className="border border-[var(--color-border)] rounded-md overflow-hidden">
                <ul className="max-h-[420px] overflow-y-auto">
                  {filtered.length === 0 && (
                    <li className="px-3 py-6 text-sm text-[var(--color-fg-muted)] text-center">
                      {query
                        ? `No repos match "${query}"`
                        : 'No repos found for this token.'}
                    </li>
                  )}
                  {filtered.map((repo) => {
                    const isSelected = selected.has(repo.nameWithOwner)
                    return (
                      <li
                        key={repo.id}
                        className="border-t border-[var(--color-border-muted)] first:border-t-0"
                      >
                        <label className="flex items-start gap-3 px-3 py-2 cursor-pointer hover:bg-[var(--color-canvas-subtle)]">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggle(repo)}
                            className="mt-1"
                            aria-label={`Track ${repo.nameWithOwner}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-sm font-semibold">
                                {repo.nameWithOwner}
                              </span>
                              {repo.isPrivate && (
                                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-[var(--color-border)] text-[var(--color-fg-muted)]">
                                  Private
                                </span>
                              )}
                              {repo.isFork && (
                                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-[var(--color-border)] text-[var(--color-fg-muted)]">
                                  Fork
                                </span>
                              )}
                              {repo.isArchived && (
                                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-[var(--color-border)] text-[var(--color-fg-muted)]">
                                  Archived
                                </span>
                              )}
                            </div>
                            {repo.description && (
                              <p className="text-xs text-[var(--color-fg-muted)] mt-0.5 truncate">
                                {repo.description}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-[var(--color-fg-subtle)] whitespace-nowrap shrink-0">
                            {formatAge(repo.pushedAt)}
                          </span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-2 sticky bottom-0 bg-[var(--color-canvas)] py-3 -mx-6 px-6 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={handleContinue}
              disabled={loading || selectedList.length === 0}
              className="min-h-[44px] px-4 bg-[var(--color-accent)] text-white text-sm font-medium rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue with {selectedList.length}{' '}
              {selectedList.length === 1 ? 'repo' : 'repos'}
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}
