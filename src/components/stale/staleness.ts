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
  authorLogin: string | null
  isBotAuthored: boolean
}

const KNOWN_BOT_LOGINS = new Set([
  'dependabot',
  'dependabot-preview',
  'renovate',
  'renovate-bot',
  'github-actions',
  'pre-commit-ci',
  'snyk-bot',
  'mergify',
  'allcontributors',
])

export function isBotLogin(login: string | null | undefined): boolean {
  if (!login) return false
  if (login.endsWith('[bot]')) return true
  return KNOWN_BOT_LOGINS.has(login.toLowerCase())
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
      const authorLogin = issue.author?.login ?? null
      items.push({
        id: `issue:${issue.id}`,
        level: d >= STALE_RED_DAYS ? 'red' : 'amber',
        repoNameWithOwner: repo.nameWithOwner,
        number: issue.number,
        title: issue.title,
        url: issue.url,
        daysQuiet: d,
        isPullRequest: false,
        authorLogin,
        isBotAuthored: isBotLogin(authorLogin),
      })
    }
    for (const pr of repo.pullRequests.nodes) {
      const d = daysQuiet(pr.updatedAt, now)
      if (d < STALE_AMBER_DAYS) continue
      const authorLogin = pr.author?.login ?? null
      items.push({
        id: `pr:${pr.id}`,
        level: d >= STALE_RED_DAYS ? 'red' : 'amber',
        repoNameWithOwner: repo.nameWithOwner,
        number: pr.number,
        title: pr.title,
        url: pr.url,
        daysQuiet: d,
        isPullRequest: true,
        authorLogin,
        isBotAuthored: isBotLogin(authorLogin),
      })
    }
  }

  return items.sort((a, b) => b.daysQuiet - a.daysQuiet)
}
