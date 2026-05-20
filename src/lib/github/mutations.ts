import { rest } from './client'

export type MergeMethod = 'merge' | 'squash' | 'rebase'

interface MergeResponse {
  sha: string
  merged: boolean
  message: string
}

export async function mergePullRequest(
  owner: string,
  name: string,
  number: number,
  method: MergeMethod = 'merge',
  signal?: AbortSignal,
): Promise<MergeResponse> {
  const r = await rest<MergeResponse>(
    `/repos/${owner}/${name}/pulls/${number}/merge`,
    {
      method: 'PUT',
      body: { merge_method: method },
      signal,
    },
  )
  return r.data
}

export async function closeIssue(
  owner: string,
  name: string,
  number: number,
  signal?: AbortSignal,
): Promise<void> {
  await rest<unknown>(`/repos/${owner}/${name}/issues/${number}`, {
    method: 'PATCH',
    body: { state: 'closed' },
    signal,
  })
}
