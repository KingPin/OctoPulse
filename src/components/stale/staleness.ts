import type { RepoSnapshot } from '@/types/github'

export type StaleLevel = 'amber' | 'red'

export interface StaleItem {
  id: string
  level: StaleLevel
  repoNameWithOwner: string
  number: number
  title: string
  url: string
  daysQuiet: number
  isPullRequest: boolean
}

const DAY_MS = 24 * 60 * 60 * 1000
// Per-thread feed thresholds: looser than RepoPulse's 3/7 (see pulse/health.ts)
// because this list shows individual rows, so we only surface threads that
// genuinely look forgotten rather than just briefly idle.
const STALE_AMBER_DAYS = 7
const STALE_RED_DAYS = 14

function daysQuiet(iso: string, now: number): number {
  return Math.floor((now - new Date(iso).getTime()) / DAY_MS)
}

/**
 * Pure transform over already-fetched repo snapshots — no extra API calls.
 * Returns only items quiet ≥7d, sorted oldest-first.
 */
export function staleWatch(
  snapshots: RepoSnapshot[],
  now: number = Date.now(),
): StaleItem[] {
  const items: StaleItem[] = []

  for (const repo of snapshots) {
    for (const issue of repo.issues.nodes) {
      const d = daysQuiet(issue.updatedAt, now)
      if (d < STALE_AMBER_DAYS) continue
      items.push({
        id: `issue:${issue.id}`,
        level: d >= STALE_RED_DAYS ? 'red' : 'amber',
        repoNameWithOwner: repo.nameWithOwner,
        number: issue.number,
        title: issue.title,
        url: issue.url,
        daysQuiet: d,
        isPullRequest: false,
      })
    }
    for (const pr of repo.pullRequests.nodes) {
      const d = daysQuiet(pr.updatedAt, now)
      if (d < STALE_AMBER_DAYS) continue
      items.push({
        id: `pr:${pr.id}`,
        level: d >= STALE_RED_DAYS ? 'red' : 'amber',
        repoNameWithOwner: repo.nameWithOwner,
        number: pr.number,
        title: pr.title,
        url: pr.url,
        daysQuiet: d,
        isPullRequest: true,
      })
    }
  }

  return items.sort((a, b) => b.daysQuiet - a.daysQuiet)
}
