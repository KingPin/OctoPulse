import { rest } from './client'

interface IssueResponse {
  title: string
  body: string | null
  user: { login: string } | null
}

interface CommentResponse {
  body: string | null
  user: { login: string } | null
  created_at: string
}

export interface ThreadMessage {
  author: string
  createdAt: string | null
  body: string
}

/**
 * Fetch the issue/PR body plus up to 100 comments and return as an ordered
 * thread. For PRs we use the issues endpoint because comments are the
 * conversational ones — review comments live elsewhere and are noisier.
 */
export async function fetchThread(
  owner: string,
  name: string,
  number: number,
  signal?: AbortSignal,
): Promise<ThreadMessage[]> {
  const issuePath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/issues/${number}`
  const commentsPath = `${issuePath}/comments?per_page=100`

  const [issue, comments] = await Promise.all([
    rest<IssueResponse>(issuePath, { signal }),
    rest<CommentResponse[]>(commentsPath, { signal }),
  ])

  const head: ThreadMessage = {
    author: issue.data.user?.login ?? 'unknown',
    createdAt: null,
    body: issue.data.body ?? '(no body)',
  }

  const rest_ = comments.data.map<ThreadMessage>((c) => ({
    author: c.user?.login ?? 'unknown',
    createdAt: c.created_at,
    body: c.body ?? '',
  }))

  return [head, ...rest_]
}

export function formatThreadForLLM(messages: ThreadMessage[]): string {
  return messages
    .map((m, i) => `[${i === 0 ? 'Opening' : `Comment ${i}`} by @${m.author}]\n${m.body}`)
    .join('\n\n---\n\n')
}
