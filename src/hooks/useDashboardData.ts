import { useCallback, useEffect, useRef, useState } from 'react'
import { graphql, type RateLimit } from '@/lib/github/client'
import { REPO_QUERY } from '@/lib/github/queries'
import * as storage from '@/lib/storage'
import type { RepoSnapshot, RepoQueryResponse } from '@/types/github'
import type { TrackedRepo } from './useRepos'
import { DEMO_REPOS } from '@/lib/demo'
import { toast } from './useToast'

const FOCUS_REFETCH_MS = 5 * 60 * 1000

export interface DashboardState {
  snapshots: RepoSnapshot[]
  lastUpdatedAt: number | null
  isFetching: boolean
  error: string | null
  rateLimitRemaining: number | null
}

interface UseDashboardDataOpts {
  trackedRepos: TrackedRepo[]
  isDemo: boolean
}

function splitOwnerRepo(nameWithOwner: string): { owner: string; name: string } | null {
  const idx = nameWithOwner.indexOf('/')
  if (idx < 1 || idx === nameWithOwner.length - 1) return null
  return {
    owner: nameWithOwner.slice(0, idx),
    name: nameWithOwner.slice(idx + 1),
  }
}

export function useDashboardData({
  trackedRepos,
  isDemo,
}: UseDashboardDataOpts): {
  state: DashboardState
  refresh: () => void
} {
  const [state, setState] = useState<DashboardState>(() => ({
    snapshots: isDemo ? DEMO_REPOS : [],
    lastUpdatedAt: isDemo ? Date.now() : storage.get<number>('lastFetchAt'),
    isFetching: false,
    error: null,
    rateLimitRemaining: null,
  }))

  const inFlight = useRef<AbortController | null>(null)

  const runFetch = useCallback(async () => {
    if (isDemo) {
      setState((s) => ({
        ...s,
        snapshots: DEMO_REPOS,
        lastUpdatedAt: Date.now(),
        error: null,
      }))
      return
    }
    if (trackedRepos.length === 0) return

    inFlight.current?.abort()
    const ac = new AbortController()
    inFlight.current = ac

    setState((s) => ({ ...s, isFetching: true, error: null }))

    try {
      const settled = await Promise.allSettled(
        trackedRepos.map(async (repo) => {
          const parsed = splitOwnerRepo(repo.nameWithOwner)
          if (!parsed) throw new Error(`Invalid repo path: ${repo.nameWithOwner}`)
          const r: { data: RepoQueryResponse; rateLimit: RateLimit } =
            await graphql<RepoQueryResponse>(
              REPO_QUERY,
              parsed,
              ac.signal,
            )
          return { repo, result: r }
        }),
      )

      if (ac.signal.aborted) return

      const snapshots: RepoSnapshot[] = []
      const failures: Array<{ nameWithOwner: string; reason: string }> = []
      let remaining: number | null = null
      settled.forEach((outcome, i) => {
        const repo = trackedRepos[i]
        if (!repo) return
        if (outcome.status === 'fulfilled') {
          const { result } = outcome.value
          if (result.data.repository) snapshots.push(result.data.repository)
          if (result.rateLimit.remaining !== null) remaining = result.rateLimit.remaining
        } else {
          const reason =
            outcome.reason instanceof Error
              ? outcome.reason.message
              : String(outcome.reason)
          failures.push({ nameWithOwner: repo.nameWithOwner, reason })
        }
      })

      const now = Date.now()
      storage.set<number>('lastFetchAt', now)
      const errorMsg =
        failures.length === 0
          ? null
          : failures.length === trackedRepos.length
            ? `Failed to load any repos: ${failures[0]?.reason ?? 'unknown error'}`
            : `Failed to load ${failures.length} of ${trackedRepos.length} repos`
      setState({
        snapshots,
        lastUpdatedAt: now,
        isFetching: false,
        error: errorMsg,
        rateLimitRemaining: remaining,
      })
      if (failures.length > 0 && failures.length < trackedRepos.length) {
        toast(
          `Couldn't load ${failures.map((f) => f.nameWithOwner).join(', ')}`,
          'warning',
          6000,
        )
      }
    } catch (e: unknown) {
      if (ac.signal.aborted) return
      const message = e instanceof Error ? e.message : 'Failed to load repos'
      setState((s) => ({ ...s, isFetching: false, error: message }))
      toast(message, 'error')
    }
  }, [trackedRepos, isDemo])

  useEffect(() => {
    runFetch()
  }, [runFetch])

  useEffect(() => {
    if (isDemo) return
    const onFocus = () => {
      const last = state.lastUpdatedAt
      if (!last || Date.now() - last > FOCUS_REFETCH_MS) {
        runFetch()
      }
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [runFetch, state.lastUpdatedAt, isDemo])

  return { state, refresh: runFetch }
}
