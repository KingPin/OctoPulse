import type { CheckState, RepoSnapshot } from '@/types/github'

export type Health = 'green' | 'amber' | 'red'

const DAY_MS = 24 * 60 * 60 * 1000
// Per-repo aggregate thresholds: a repo turns amber/red as soon as *any*
// thread crosses them. Tighter than StaleWatch's 7/14 (see stale/staleness.ts)
// because the per-repo grid should flag drift earlier than the per-thread feed.
const STALE_AMBER_DAYS = 3
const STALE_RED_DAYS = 7

function daysSince(iso: string, now: number): number {
  return (now - new Date(iso).getTime()) / DAY_MS
}

function isCheckRed(state: CheckState | null | undefined): boolean {
  return state === 'FAILURE' || state === 'ERROR'
}

/**
 * Roll a repo snapshot up to a single health color.
 *
 * Red: build failing on default branch OR any open item ≥7d since update.
 * Amber: any open item ≥3d since update.
 * Green: everything fresh and CI green.
 */
export function computeHealth(
  repo: RepoSnapshot,
  now: number = Date.now(),
): Health {
  const checkState = repo.defaultBranchRef?.target?.statusCheckRollup?.state
  if (isCheckRed(checkState)) return 'red'

  let amber = false
  for (const issue of repo.issues.nodes) {
    const d = daysSince(issue.updatedAt, now)
    if (d >= STALE_RED_DAYS) return 'red'
    if (d >= STALE_AMBER_DAYS) amber = true
  }
  for (const pr of repo.pullRequests.nodes) {
    const d = daysSince(pr.updatedAt, now)
    if (d >= STALE_RED_DAYS) return 'red'
    if (d >= STALE_AMBER_DAYS) amber = true
  }

  return amber ? 'amber' : 'green'
}
