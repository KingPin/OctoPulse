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
  const lastUpdatedAtRef = useRef<number | null>(state.lastUpdatedAt)

  const runFetch = useCallback(async () => {
    if (isDemo) {
      inFlight.current?.abort()
      inFlight.current = null
      setState((s) => ({
        ...s,
        snapshots: DEMO_REPOS,
        lastUpdatedAt: Date.now(),
        error: null,
      }))
      return
    }
    if (trackedRepos.length === 0) {
      inFlight.current?.abort()
      inFlight.current = null
      setState((s) => ({ ...s, snapshots: [], isFetching: false, error: null }))
      return
    }

    inFlight.current?.abort()
    const ac = new AbortController()
    inFlight.current = ac

    setState((s) => ({ ...s, isFetching: true, error: null }))

    type FetchOutcome =
      | { ok: true; nameWithOwner: string; result: { data: RepoQueryResponse; rateLimit: RateLimit } }
      | { ok: false; nameWithOwner: string; reason: string }

    try {
      const outcomes: FetchOutcome[] = await Promise.all(
        trackedRepos.map(async (repo): Promise<FetchOutcome> => {
          const parsed = splitOwnerRepo(repo.nameWithOwner)
          if (!parsed) {
            return { ok: false, nameWithOwner: repo.nameWithOwner, reason: 'Invalid repo path' }
          }
          try {
            const result = await graphql<RepoQueryResponse>(REPO_QUERY, parsed, ac.signal)
            return { ok: true, nameWithOwner: repo.nameWithOwner, result }
          } catch (e) {
            if (ac.signal.aborted) throw e
            const reason = e instanceof Error ? e.message : String(e)
            return { ok: false, nameWithOwner: repo.nameWithOwner, reason }
          }
        }),
      )

      if (ac.signal.aborted) return

      const snapshots: RepoSnapshot[] = []
      const failures: Array<{ nameWithOwner: string; reason: string }> = []
      let remaining: number | null = null
      for (const outcome of outcomes) {
        if (outcome.ok) {
          if (outcome.result.data.repository) snapshots.push(outcome.result.data.repository)
          if (outcome.result.rateLimit.remaining !== null) {
            remaining = outcome.result.rateLimit.remaining
          }
        } else {
          failures.push({ nameWithOwner: outcome.nameWithOwner, reason: outcome.reason })
        }
      }

      const now = Date.now()
      storage.set<number>('lastFetchAt', now)
      lastUpdatedAtRef.current = now
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
      const last = lastUpdatedAtRef.current
      if (!last || Date.now() - last > FOCUS_REFETCH_MS) {
        runFetch()
      }
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [runFetch, isDemo])

  return { state, refresh: runFetch }
}
