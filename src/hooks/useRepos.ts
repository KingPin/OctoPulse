import { useCallback, useEffect, useState } from 'react'
import * as storage from '@/lib/storage'

export interface TrackedRepo {
  /** GraphQL node id when known; falls back to `owner/repo` for externals. */
  id: string
  nameWithOwner: string
  description: string | null
  isPrivate: boolean
  isFork: boolean
  isArchived: boolean
  pushedAt: string
  /** Set when the user pasted owner/repo manually (not in viewer.repositories). */
  external?: boolean
}

export type ReposState =
  | { status: 'loading' }
  | { status: 'unconfigured' }
  | { status: 'configured'; repos: TrackedRepo[] }

/** Soft cap. Above this, the picker warns; it doesn't hard-block. */
export const REPO_SOFT_CAP = 30

export function useTrackedRepos(): {
  state: ReposState
  save: (repos: TrackedRepo[]) => void
  reset: () => void
} {
  const [state, setState] = useState<ReposState>({ status: 'loading' })

  useEffect(() => {
    const stored = storage.get<TrackedRepo[]>('trackedRepos')
    if (stored && stored.length > 0) {
      setState({ status: 'configured', repos: stored })
    } else {
      setState({ status: 'unconfigured' })
    }
  }, [])

  const save = useCallback((repos: TrackedRepo[]) => {
    storage.set<TrackedRepo[]>('trackedRepos', repos)
    setState({ status: 'configured', repos })
  }, [])

  const reset = useCallback(() => {
    storage.remove('trackedRepos')
    setState({ status: 'unconfigured' })
  }, [])

  return { state, save, reset }
}
