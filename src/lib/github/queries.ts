/**
 * The unified per-repo query. One POST per tracked repo, issued in parallel.
 *
 * `authorAssociation` on issues, PRs, and comments lets the categorizer detect
 * which contributions are external vs. maintainer-authored without an extra
 * collaborators API call.
 */
export const REPO_QUERY = /* GraphQL */ `
  query RepoSnapshot($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      id
      name
      nameWithOwner
      description
      url
      isPrivate
      isFork
      isArchived
      pushedAt
      defaultBranchRef {
        name
        target {
          ... on Commit {
            oid
            statusCheckRollup {
              state
            }
            committedDate
          }
        }
      }
      issues(states: OPEN, first: 30, orderBy: { field: UPDATED_AT, direction: DESC }) {
        totalCount
        nodes {
          id
          number
          title
          url
          createdAt
          updatedAt
          authorAssociation
          author {
            login
            avatarUrl
          }
          assignees(first: 10) {
            nodes {
              login
            }
          }
          comments(last: 100) {
            totalCount
            nodes {
              authorAssociation
              author {
                login
              }
              createdAt
            }
          }
        }
      }
      pullRequests(states: OPEN, first: 30, orderBy: { field: UPDATED_AT, direction: DESC }) {
        totalCount
        nodes {
          id
          number
          title
          url
          isDraft
          createdAt
          updatedAt
          authorAssociation
          author {
            login
            avatarUrl
          }
          headRefName
          reviewDecision
          commits(last: 1) {
            nodes {
              commit {
                statusCheckRollup {
                  state
                }
              }
            }
          }
          reviewRequests(first: 10) {
            nodes {
              requestedReviewer {
                ... on User {
                  login
                }
                ... on Team {
                  name
                }
              }
            }
          }
          assignees(first: 10) {
            nodes {
              login
            }
          }
          comments(last: 100) {
            totalCount
            nodes {
              authorAssociation
              author {
                login
              }
              createdAt
            }
          }
        }
      }
      releases(first: 1, orderBy: { field: CREATED_AT, direction: DESC }) {
        totalCount
        nodes {
          tagName
          createdAt
          isDraft
        }
      }
    }
  }
`

/**
 * Paginated list of repos the viewer has access to. Used by the repo picker.
 * Includes ownership info + pushedAt so we can default-select recently-pushed.
 */
export const VIEWER_REPOS_QUERY = /* GraphQL */ `
  query ViewerRepos($cursor: String) {
    viewer {
      login
      repositories(
        first: 100
        after: $cursor
        affiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER]
        orderBy: { field: PUSHED_AT, direction: DESC }
      ) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          name
          nameWithOwner
          description
          isPrivate
          isFork
          isArchived
          pushedAt
          owner {
            login
          }
        }
      }
    }
  }
`
