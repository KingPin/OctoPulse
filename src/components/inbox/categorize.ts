import {
  MAINTAINER_ASSOCIATIONS,
  type AuthorAssociation,
  type Issue,
  type IssueComment,
  type PullRequest,
  type RepoSnapshot,
} from '@/types/github'

export type InboxCategory =
  | 'review'
  | 'assigned'
  | 'blocked'
  | 'unanswered'

export interface InboxItem {
  /** Stable per-item id, used as a React key. */
  id: string
  category: InboxCategory
  repoNameWithOwner: string
  number: number
  title: string
  url: string
  ageDays: number
  isPullRequest: boolean
  /** ISO timestamp the row sorts on (createdAt for issues, updatedAt for PRs). */
  sortAt: string
  /** Author of the issue/PR (for display). */
  authorLogin: string | null
}

const DAY_MS = 24 * 60 * 60 * 1000

function ageDays(iso: string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / DAY_MS))
}

function isMaintainer(assoc: AuthorAssociation): boolean {
  return MAINTAINER_ASSOCIATIONS.includes(assoc)
}

function hasMaintainerComment(comments: IssueComment[]): boolean {
  return comments.some((c) => isMaintainer(c.authorAssociation))
}

function viewerIsAssigned(
  assignees: { nodes: Array<{ login: string }> },
  viewerLogin: string,
): boolean {
  return assignees.nodes.some((a) => a.login === viewerLogin)
}

function viewerIsRequestedReviewer(pr: PullRequest, viewerLogin: string): boolean {
  return pr.reviewRequests.nodes.some((r) => {
    const reviewer = r.requestedReviewer
    return !!reviewer && 'login' in reviewer && reviewer.login === viewerLogin
  })
}

function prHasFailingChecks(pr: PullRequest): boolean {
  const last = pr.commits.nodes[pr.commits.nodes.length - 1]
  const state = last?.commit.statusCheckRollup?.state
  return state === 'FAILURE' || state === 'ERROR'
}

/**
 * Pure transformation: snapshot data -> inbox items.
 * Each item appears in at most one category — categories are evaluated in
 * priority order (review → blocked → assigned → unanswered).
 */
export function categorize(
  snapshots: RepoSnapshot[],
  viewerLogin: string,
  now: number = Date.now(),
): InboxItem[] {
  const items: InboxItem[] = []
  const seen = new Set<string>()

  const push = (item: InboxItem) => {
    if (seen.has(item.id)) return
    seen.add(item.id)
    items.push(item)
  }

  for (const repo of snapshots) {
    for (const pr of repo.pullRequests.nodes) {
      if (pr.isDraft) continue

      if (viewerIsRequestedReviewer(pr, viewerLogin)) {
        push(prItem(repo, pr, 'review', now))
        continue
      }
      if (
        pr.author?.login === viewerLogin &&
        (pr.reviewDecision === 'CHANGES_REQUESTED' || prHasFailingChecks(pr))
      ) {
        push(prItem(repo, pr, 'blocked', now))
        continue
      }
      if (viewerIsAssigned(pr.assignees, viewerLogin)) {
        push(prItem(repo, pr, 'assigned', now))
        continue
      }
    }

    for (const issue of repo.issues.nodes) {
      if (viewerIsAssigned(issue.assignees, viewerLogin)) {
        push(issueItem(repo, issue, 'assigned', now))
        continue
      }
      if (
        !isMaintainer(issue.authorAssociation) &&
        issue.author?.login !== viewerLogin &&
        !hasMaintainerComment(issue.comments.nodes)
      ) {
        push(issueItem(repo, issue, 'unanswered', now))
        continue
      }
    }
  }

  return items.sort((a, b) => {
    const order: Record<InboxCategory, number> = {
      review: 0,
      blocked: 1,
      assigned: 2,
      unanswered: 3,
    }
    if (order[a.category] !== order[b.category])
      return order[a.category] - order[b.category]
    return b.sortAt.localeCompare(a.sortAt)
  })
}

function prItem(
  repo: RepoSnapshot,
  pr: PullRequest,
  category: InboxCategory,
  now: number,
): InboxItem {
  return {
    id: `pr:${pr.id}:${category}`,
    category,
    repoNameWithOwner: repo.nameWithOwner,
    number: pr.number,
    title: pr.title,
    url: pr.url,
    ageDays: ageDays(pr.updatedAt, now),
    sortAt: pr.updatedAt,
    isPullRequest: true,
    authorLogin: pr.author?.login ?? null,
  }
}

function issueItem(
  repo: RepoSnapshot,
  issue: Issue,
  category: InboxCategory,
  now: number,
): InboxItem {
  return {
    id: `issue:${issue.id}:${category}`,
    category,
    repoNameWithOwner: repo.nameWithOwner,
    number: issue.number,
    title: issue.title,
    url: issue.url,
    ageDays: ageDays(issue.createdAt, now),
    sortAt: issue.createdAt,
    isPullRequest: false,
    authorLogin: issue.author?.login ?? null,
  }
}

export const CATEGORY_META: Record<
  InboxCategory,
  { label: string; tone: 'accent' | 'danger' | 'attention' | 'success' }
> = {
  review: { label: 'Review request', tone: 'accent' },
  blocked: { label: 'Blocked', tone: 'danger' },
  assigned: { label: 'Assigned', tone: 'attention' },
  unanswered: { label: 'Unanswered', tone: 'success' },
}
