/** Author association levels from GitHub GraphQL. */
export type AuthorAssociation =
  | 'OWNER'
  | 'MEMBER'
  | 'COLLABORATOR'
  | 'CONTRIBUTOR'
  | 'FIRST_TIME_CONTRIBUTOR'
  | 'FIRST_TIMER'
  | 'MANNEQUIN'
  | 'NONE'

/** Maintainer-level associations — used to detect responses from project staff. */
export const MAINTAINER_ASSOCIATIONS: ReadonlyArray<AuthorAssociation> = [
  'OWNER',
  'MEMBER',
  'COLLABORATOR',
]

export type CheckState =
  | 'SUCCESS'
  | 'FAILURE'
  | 'ERROR'
  | 'PENDING'
  | 'EXPECTED'

export type ReviewDecision = 'CHANGES_REQUESTED' | 'APPROVED' | 'REVIEW_REQUIRED'

export interface AuthorRef {
  login: string
  avatarUrl: string
}

export interface IssueComment {
  authorAssociation: AuthorAssociation
  author: { login: string } | null
  createdAt: string
}

export interface Issue {
  id: string
  number: number
  title: string
  url: string
  createdAt: string
  updatedAt: string
  authorAssociation: AuthorAssociation
  author: AuthorRef | null
  assignees: { nodes: Array<{ login: string }> }
  comments: {
    totalCount: number
    nodes: IssueComment[]
  }
}

export interface PullRequest {
  id: string
  number: number
  title: string
  url: string
  isDraft: boolean
  createdAt: string
  updatedAt: string
  authorAssociation: AuthorAssociation
  author: AuthorRef | null
  headRefName: string
  reviewDecision: ReviewDecision | null
  commits: {
    nodes: Array<{
      commit: { statusCheckRollup: { state: CheckState } | null }
    }>
  }
  reviewRequests: {
    nodes: Array<{
      requestedReviewer:
        | { login: string }
        | { name: string }
        | null
    }>
  }
  assignees: { nodes: Array<{ login: string }> }
  comments: {
    totalCount: number
    nodes: IssueComment[]
  }
}

export interface Release {
  tagName: string
  createdAt: string
  isDraft: boolean
}

export interface RepoSnapshot {
  id: string
  name: string
  nameWithOwner: string
  description: string | null
  url: string
  isPrivate: boolean
  isFork: boolean
  isArchived: boolean
  pushedAt: string
  defaultBranchRef: {
    name: string
    target: {
      oid: string
      committedDate: string
      statusCheckRollup: { state: CheckState } | null
    } | null
  } | null
  issues: { totalCount: number; nodes: Issue[] }
  pullRequests: { totalCount: number; nodes: PullRequest[] }
  releases: { totalCount: number; nodes: Release[] }
}

export interface RepoQueryResponse {
  repository: RepoSnapshot | null
}

export interface ViewerReposResponse {
  viewer: {
    login: string
    repositories: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
      nodes: Array<{
        id: string
        name: string
        nameWithOwner: string
        description: string | null
        isPrivate: boolean
        isFork: boolean
        isArchived: boolean
        pushedAt: string
        owner: { login: string }
      }>
    }
  }
}
