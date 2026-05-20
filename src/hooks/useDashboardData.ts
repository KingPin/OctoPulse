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
      const results = await Promise.all(
        trackedRepos.map(async (repo) => {
          const parsed = splitOwnerRepo(repo.nameWithOwner)
          if (!parsed) return null
          const r: { data: RepoQueryResponse; rateLimit: RateLimit } =
            await graphql<RepoQueryResponse>(
              REPO_QUERY,
              parsed,
              ac.signal,
            )
          return r
        }),
      )

      if (ac.signal.aborted) return

      const snapshots: RepoSnapshot[] = []
      let remaining: number | null = null
      for (const r of results) {
        if (!r) continue
        if (r.data.repository) snapshots.push(r.data.repository)
        if (r.rateLimit.remaining !== null) remaining = r.rateLimit.remaining
      }

      const now = Date.now()
      storage.set<number>('lastFetchAt', now)
      setState({
        snapshots,
        lastUpdatedAt: now,
        isFetching: false,
        error: null,
        rateLimitRemaining: remaining,
      })
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
