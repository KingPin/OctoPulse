import { describe, expect, it } from 'vitest'
import { categorize } from './categorize'
import type {
  AuthorAssociation,
  CheckState,
  Issue,
  PullRequest,
  RepoSnapshot,
} from '@/types/github'

const NOW = new Date('2026-05-19T12:00:00Z').getTime()
const VIEWER = 'octocat'

function makeRepo(opts: {
  name?: string
  issues?: Issue[]
  prs?: PullRequest[]
}): RepoSnapshot {
  return {
    id: `r:${opts.name ?? 'repo'}`,
    name: opts.name ?? 'repo',
    nameWithOwner: `acme/${opts.name ?? 'repo'}`,
    description: null,
    url: `https://github.com/acme/${opts.name ?? 'repo'}`,
    isPrivate: false,
    isFork: false,
    isArchived: false,
    stargazerCount: 0,
    forkCount: 0,
    pushedAt: '2026-05-18T00:00:00Z',
    defaultBranchRef: null,
    issues: { totalCount: opts.issues?.length ?? 0, nodes: opts.issues ?? [] },
    pullRequests: {
      totalCount: opts.prs?.length ?? 0,
      nodes: opts.prs ?? [],
    },
    releases: { totalCount: 0, nodes: [] },
  }
}

function makeIssue(opts: {
  id: string
  authorLogin?: string
  authorAssociation?: AuthorAssociation
  assignees?: string[]
  commentAssociations?: AuthorAssociation[]
  createdAt?: string
}): Issue {
  return {
    id: opts.id,
    number: 1,
    title: `Issue ${opts.id}`,
    url: `https://example/${opts.id}`,
    createdAt: opts.createdAt ?? '2026-05-15T00:00:00Z',
    updatedAt: opts.createdAt ?? '2026-05-15T00:00:00Z',
    authorAssociation: opts.authorAssociation ?? 'NONE',
    author: opts.authorLogin
      ? { login: opts.authorLogin, avatarUrl: '' }
      : null,
    assignees: { nodes: (opts.assignees ?? []).map((login) => ({ login })) },
    comments: {
      totalCount: opts.commentAssociations?.length ?? 0,
      nodes: (opts.commentAssociations ?? []).map((assoc) => ({
        authorAssociation: assoc,
        author: { login: 'someone' },
        createdAt: '2026-05-16T00:00:00Z',
      })),
    },
  }
}

function makePR(opts: {
  id: string
  authorLogin?: string
  assignees?: string[]
  requestedReviewers?: string[]
  reviewDecision?: PullRequest['reviewDecision']
  checkState?: CheckState | null
  isDraft?: boolean
}): PullRequest {
  return {
    id: opts.id,
    number: 1,
    title: `PR ${opts.id}`,
    url: `https://example/${opts.id}`,
    isDraft: opts.isDraft ?? false,
    createdAt: '2026-05-15T00:00:00Z',
    updatedAt: '2026-05-15T00:00:00Z',
    authorAssociation: 'OWNER',
    author: opts.authorLogin
      ? { login: opts.authorLogin, avatarUrl: '' }
      : null,
    headRefName: 'feature',
    reviewDecision: opts.reviewDecision ?? null,
    commits: {
      nodes: [
        {
          commit: {
            statusCheckRollup:
              opts.checkState === undefined
                ? null
                : opts.checkState === null
                  ? null
                  : { state: opts.checkState },
          },
        },
      ],
    },
    reviewRequests: {
      nodes: (opts.requestedReviewers ?? []).map((login) => ({
        requestedReviewer: { login },
      })),
    },
    assignees: { nodes: (opts.assignees ?? []).map((login) => ({ login })) },
    comments: { totalCount: 0, nodes: [] },
  }
}

describe('categorize', () => {
  it('flags a PR that requests the viewer as a reviewer', () => {
    const repo = makeRepo({
      prs: [makePR({ id: 'pr1', requestedReviewers: [VIEWER] })],
    })
    const items = categorize([repo], VIEWER, NOW)
    expect(items).toHaveLength(1)
    expect(items[0]!.category).toBe('review')
  })

  it("flags the viewer's own PR with CHANGES_REQUESTED as blocked", () => {
    const repo = makeRepo({
      prs: [
        makePR({
          id: 'pr1',
          authorLogin: VIEWER,
          reviewDecision: 'CHANGES_REQUESTED',
        }),
      ],
    })
    const items = categorize([repo], VIEWER, NOW)
    expect(items).toHaveLength(1)
    expect(items[0]!.category).toBe('blocked')
  })

  it("flags the viewer's own PR with failing checks as blocked", () => {
    const repo = makeRepo({
      prs: [
        makePR({
          id: 'pr1',
          authorLogin: VIEWER,
          checkState: 'FAILURE',
        }),
      ],
    })
    const items = categorize([repo], VIEWER, NOW)
    expect(items).toHaveLength(1)
    expect(items[0]!.category).toBe('blocked')
  })

  it('flags an issue assigned to the viewer as assigned', () => {
    const repo = makeRepo({
      issues: [makeIssue({ id: 'i1', assignees: [VIEWER] })],
    })
    const items = categorize([repo], VIEWER, NOW)
    expect(items).toHaveLength(1)
    expect(items[0]!.category).toBe('assigned')
  })

  it('flags an external-author issue with no maintainer comment as unanswered', () => {
    const repo = makeRepo({
      issues: [
        makeIssue({
          id: 'i1',
          authorLogin: 'random-user',
          authorAssociation: 'NONE',
          commentAssociations: ['NONE', 'CONTRIBUTOR'],
        }),
      ],
    })
    const items = categorize([repo], VIEWER, NOW)
    expect(items).toHaveLength(1)
    expect(items[0]!.category).toBe('unanswered')
  })

  it('does NOT flag unanswered when a maintainer has commented', () => {
    const repo = makeRepo({
      issues: [
        makeIssue({
          id: 'i1',
          authorLogin: 'random-user',
          authorAssociation: 'NONE',
          commentAssociations: ['OWNER'],
        }),
      ],
    })
    const items = categorize([repo], VIEWER, NOW)
    expect(items).toHaveLength(0)
  })

  it('does NOT flag unanswered when the author is a maintainer', () => {
    const repo = makeRepo({
      issues: [
        makeIssue({
          id: 'i1',
          authorLogin: 'a-collab',
          authorAssociation: 'COLLABORATOR',
        }),
      ],
    })
    const items = categorize([repo], VIEWER, NOW)
    expect(items).toHaveLength(0)
  })

  it('does NOT flag unanswered when the viewer themselves authored the issue', () => {
    const repo = makeRepo({
      issues: [
        makeIssue({
          id: 'i1',
          authorLogin: VIEWER,
          authorAssociation: 'NONE',
        }),
      ],
    })
    const items = categorize([repo], VIEWER, NOW)
    expect(items).toHaveLength(0)
  })

  it('skips draft PRs', () => {
    const repo = makeRepo({
      prs: [
        makePR({
          id: 'pr1',
          requestedReviewers: [VIEWER],
          isDraft: true,
        }),
      ],
    })
    const items = categorize([repo], VIEWER, NOW)
    expect(items).toHaveLength(0)
  })

  it('puts review requests before blocked and assigned in sort order', () => {
    const repo = makeRepo({
      prs: [
        makePR({ id: 'a', assignees: [VIEWER] }),
        makePR({
          id: 'b',
          authorLogin: VIEWER,
          reviewDecision: 'CHANGES_REQUESTED',
        }),
        makePR({ id: 'c', requestedReviewers: [VIEWER] }),
      ],
    })
    const items = categorize([repo], VIEWER, NOW)
    expect(items.map((i) => i.category)).toEqual([
      'review',
      'blocked',
      'assigned',
    ])
  })
})
