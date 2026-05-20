import { graphql, type RateLimit } from './client'
import { VIEWER_REPOS_QUERY } from './queries'
import type { ViewerReposResponse } from '@/types/github'

export interface ViewerRepo {
  id: string
  nameWithOwner: string
  description: string | null
  isPrivate: boolean
  isFork: boolean
  isArchived: boolean
  pushedAt: string
}

/** Fetches all repos the viewer has access to, following pagination. */
export async function fetchViewerRepos(
  signal?: AbortSignal,
): Promise<ViewerRepo[]> {
  const all: ViewerRepo[] = []
  let cursor: string | null = null
  let hasNext = true

  while (hasNext) {
    const result: { data: ViewerReposResponse; rateLimit: RateLimit } =
      await graphql<ViewerReposResponse>(VIEWER_REPOS_QUERY, { cursor }, signal)
    const page = result.data.viewer.repositories
    for (const node of page.nodes) all.push(node)
    hasNext = page.pageInfo.hasNextPage && page.pageInfo.endCursor !== null
    cursor = page.pageInfo.endCursor
  }

  return all
}
