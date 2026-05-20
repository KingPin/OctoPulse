import type { RepoSnapshot } from '@/types/github'
import type { Viewer } from '@/lib/github/types'

export const DEMO_VIEWER: Viewer = {
  login: 'octocat-demo',
  id: 999999,
  avatarUrl: 'https://avatars.githubusercontent.com/u/583231?v=4',
  name: 'Octocat (demo)',
}

const now = Date.now()
const daysAgo = (n: number): string =>
  new Date(now - n * 24 * 60 * 60 * 1000).toISOString()

export const DEMO_REPOS: RepoSnapshot[] = [
  {
    id: 'r1',
    name: 'cli',
    nameWithOwner: 'octocat-demo/cli',
    description: 'A small command-line tool for managing local Octopulse data.',
    url: 'https://github.com/octocat-demo/cli',
    isPrivate: false,
    isFork: false,
    isArchived: false,
    pushedAt: daysAgo(1),
    defaultBranchRef: {
      name: 'main',
      target: {
        oid: 'abc1234',
        committedDate: daysAgo(1),
        statusCheckRollup: { state: 'FAILURE' },
      },
    },
    issues: {
      totalCount: 4,
      nodes: [
        {
          id: 'i1',
          number: 482,
          title: 'brew install fails on Apple Silicon M3',
          url: 'https://github.com/octocat-demo/cli/issues/482',
          createdAt: daysAgo(2),
          updatedAt: daysAgo(2),
          authorAssociation: 'NONE',
          author: {
            login: 'first-time-user',
            avatarUrl: 'https://avatars.githubusercontent.com/u/1?v=4',
          },
          assignees: { nodes: [] },
          comments: { totalCount: 0, nodes: [] },
        },
        {
          id: 'i2',
          number: 480,
          title: 'Docs: missing example for --json flag',
          url: 'https://github.com/octocat-demo/cli/issues/480',
          createdAt: daysAgo(9),
          updatedAt: daysAgo(9),
          authorAssociation: 'CONTRIBUTOR',
          author: {
            login: 'a-contributor',
            avatarUrl: 'https://avatars.githubusercontent.com/u/2?v=4',
          },
          assignees: { nodes: [] },
          comments: { totalCount: 2, nodes: [] },
        },
        {
          id: 'i3',
          number: 470,
          title: 'Feature request: shell completions',
          url: 'https://github.com/octocat-demo/cli/issues/470',
          createdAt: daysAgo(18),
          updatedAt: daysAgo(15),
          authorAssociation: 'NONE',
          author: {
            login: 'random-user',
            avatarUrl: 'https://avatars.githubusercontent.com/u/3?v=4',
          },
          assignees: { nodes: [{ login: 'octocat-demo' }] },
          comments: {
            totalCount: 3,
            nodes: [
              {
                authorAssociation: 'OWNER',
                author: { login: 'octocat-demo' },
                createdAt: daysAgo(15),
              },
            ],
          },
        },
      ],
    },
    pullRequests: {
      totalCount: 2,
      nodes: [
        {
          id: 'p1',
          number: 511,
          title: 'Fix race condition in --watch mode',
          url: 'https://github.com/octocat-demo/cli/pull/511',
          isDraft: false,
          createdAt: daysAgo(3),
          updatedAt: daysAgo(1),
          authorAssociation: 'OWNER',
          author: {
            login: 'octocat-demo',
            avatarUrl: 'https://avatars.githubusercontent.com/u/583231?v=4',
          },
          headRefName: 'fix-watch-race',
          reviewDecision: 'CHANGES_REQUESTED',
          commits: {
            nodes: [
              {
                commit: { statusCheckRollup: { state: 'FAILURE' } },
              },
            ],
          },
          reviewRequests: { nodes: [] },
          assignees: { nodes: [] },
          comments: { totalCount: 4, nodes: [] },
        },
      ],
    },
    releases: {
      totalCount: 1,
      nodes: [{ tagName: 'v0.4.2', createdAt: daysAgo(11), isDraft: false }],
    },
  },
  {
    id: 'r2',
    name: 'api',
    nameWithOwner: 'octocat-demo/api',
    description: 'JSON API server powering the dashboard.',
    url: 'https://github.com/octocat-demo/api',
    isPrivate: true,
    isFork: false,
    isArchived: false,
    pushedAt: daysAgo(0),
    defaultBranchRef: {
      name: 'main',
      target: {
        oid: 'def5678',
        committedDate: daysAgo(0),
        statusCheckRollup: { state: 'SUCCESS' },
      },
    },
    issues: {
      totalCount: 1,
      nodes: [
        {
          id: 'i4',
          number: 99,
          title: 'Migrate token storage to argon2',
          url: 'https://github.com/octocat-demo/api/issues/99',
          createdAt: daysAgo(4),
          updatedAt: daysAgo(4),
          authorAssociation: 'OWNER',
          author: {
            login: 'octocat-demo',
            avatarUrl: 'https://avatars.githubusercontent.com/u/583231?v=4',
          },
          assignees: { nodes: [] },
          comments: { totalCount: 0, nodes: [] },
        },
      ],
    },
    pullRequests: {
      totalCount: 1,
      nodes: [
        {
          id: 'p2',
          number: 240,
          title: 'Add OpenAPI 3.1 schema export',
          url: 'https://github.com/octocat-demo/api/pull/240',
          isDraft: false,
          createdAt: daysAgo(5),
          updatedAt: daysAgo(5),
          authorAssociation: 'COLLABORATOR',
          author: {
            login: 'a-collab',
            avatarUrl: 'https://avatars.githubusercontent.com/u/4?v=4',
          },
          headRefName: 'openapi-export',
          reviewDecision: 'REVIEW_REQUIRED',
          commits: {
            nodes: [
              {
                commit: { statusCheckRollup: { state: 'SUCCESS' } },
              },
            ],
          },
          reviewRequests: {
            nodes: [{ requestedReviewer: { login: 'octocat-demo' } }],
          },
          assignees: { nodes: [] },
          comments: { totalCount: 1, nodes: [] },
        },
      ],
    },
    releases: { totalCount: 0, nodes: [] },
  },
  {
    id: 'r3',
    name: 'docs',
    nameWithOwner: 'octocat-demo/docs',
    description: 'Markdown documentation site.',
    url: 'https://github.com/octocat-demo/docs',
    isPrivate: false,
    isFork: false,
    isArchived: false,
    pushedAt: daysAgo(0),
    defaultBranchRef: {
      name: 'main',
      target: {
        oid: 'aaa1111',
        committedDate: daysAgo(0),
        statusCheckRollup: { state: 'SUCCESS' },
      },
    },
    issues: { totalCount: 0, nodes: [] },
    pullRequests: { totalCount: 0, nodes: [] },
    releases: { totalCount: 0, nodes: [] },
  },
  {
    id: 'r4',
    name: 'legacy-tool',
    nameWithOwner: 'octocat-demo/legacy-tool',
    description: 'Old utility kept around for reference.',
    url: 'https://github.com/octocat-demo/legacy-tool',
    isPrivate: false,
    isFork: true,
    isArchived: false,
    pushedAt: daysAgo(45),
    defaultBranchRef: {
      name: 'master',
      target: {
        oid: 'fff9999',
        committedDate: daysAgo(45),
        statusCheckRollup: null,
      },
    },
    issues: {
      totalCount: 1,
      nodes: [
        {
          id: 'i5',
          number: 12,
          title: '@octocat-demo can you take a look at this PR?',
          url: 'https://github.com/octocat-demo/legacy-tool/issues/12',
          createdAt: daysAgo(20),
          updatedAt: daysAgo(20),
          authorAssociation: 'CONTRIBUTOR',
          author: {
            login: 'another-user',
            avatarUrl: 'https://avatars.githubusercontent.com/u/5?v=4',
          },
          assignees: { nodes: [{ login: 'octocat-demo' }] },
          comments: { totalCount: 1, nodes: [] },
        },
      ],
    },
    pullRequests: { totalCount: 0, nodes: [] },
    releases: { totalCount: 0, nodes: [] },
  },
]

export interface DemoWorkspace {
  viewer: Viewer
  repos: RepoSnapshot[]
}

export function getDemoWorkspace(): DemoWorkspace {
  return { viewer: DEMO_VIEWER, repos: DEMO_REPOS }
}
