import * as storage from '@/lib/storage'

const GRAPHQL_ENDPOINT = 'https://api.github.com/graphql'
const REST_BASE = 'https://api.github.com'
const MAX_RETRIES = 3

export interface RateLimit {
  remaining: number | null
  limit: number | null
  reset: Date | null
  cost: number | null
}

export type GitHubErrorKind = 'forbidden' | 'rate-limit' | 'auth' | 'unknown'

export class GitHubError extends Error {
  status: number
  body: unknown
  kind: GitHubErrorKind

  constructor(
    message: string,
    status: number,
    body?: unknown,
    kind: GitHubErrorKind = 'unknown',
  ) {
    super(message)
    this.name = 'GitHubError'
    this.status = status
    this.body = body
    this.kind = kind
  }
}

const PERMISSION_MESSAGE_RE =
  /not accessible|repository was archived|requires? .* (scope|permission)|must have .* (permission|access|right)/i

/**
 * Read a 403/429 response body and decide whether it's a permission denial
 * (throw immediately) or a rate limit (caller should retry).
 * Returns the parsed body so the caller doesn't consume it again.
 */
async function classify403(
  res: Response,
): Promise<{ permission: boolean; body: string; message: string | null }> {
  const text = await res.text()
  let message: string | null = null
  try {
    const parsed = JSON.parse(text) as { message?: string }
    message = typeof parsed.message === 'string' ? parsed.message : null
  } catch {
    // not JSON
  }
  if (message && PERMISSION_MESSAGE_RE.test(message)) {
    return { permission: true, body: text, message }
  }
  return { permission: false, body: text, message }
}

function getToken(): string {
  const stored = storage.get<{ token: string }>('githubToken')
  if (!stored?.token) throw new GitHubError('Not authenticated', 401)
  return stored.token
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function parseRateLimit(res: Response): RateLimit {
  const remaining = res.headers.get('x-ratelimit-remaining')
  const limit = res.headers.get('x-ratelimit-limit')
  const reset = res.headers.get('x-ratelimit-reset')
  return {
    remaining: remaining ? Number(remaining) : null,
    limit: limit ? Number(limit) : null,
    reset: reset ? new Date(Number(reset) * 1000) : null,
    cost: null,
  }
}

/** POST a GraphQL query. Returns `data` on success; throws GitHubError on failure. */
export async function graphql<T = unknown>(
  query: string,
  variables: Record<string, unknown> = {},
  signal?: AbortSignal,
): Promise<{ data: T; rateLimit: RateLimit }> {
  const token = getToken()
  let lastError: Error | null = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    let res: Response
    try {
      res = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({ query, variables }),
        signal,
      })
    } catch (e) {
      lastError = e as Error
      if (signal?.aborted) throw e
      await sleep(2 ** attempt * 500)
      continue
    }

    const rateLimit = parseRateLimit(res)

    if (res.status === 401) {
      throw new GitHubError('Token invalid or expired', 401, undefined, 'auth')
    }

    if (res.status === 403 || res.status === 429) {
      const { permission, body, message } = await classify403(res)
      if (permission) {
        throw new GitHubError(
          message ?? 'Forbidden',
          res.status,
          body,
          'forbidden',
        )
      }
      lastError = new GitHubError(
        `HTTP ${res.status} ${res.statusText}`,
        res.status,
        body,
        'rate-limit',
      )
      const retryAfter = res.headers.get('retry-after')
      const waitMs = retryAfter ? Number(retryAfter) * 1000 : 2 ** attempt * 1000
      await sleep(waitMs)
      continue
    }

    if (res.status >= 500) {
      lastError = new GitHubError(
        `HTTP ${res.status} ${res.statusText}`,
        res.status,
      )
      await sleep(2 ** attempt * 500)
      continue
    }

    if (!res.ok) {
      const body = await res.text()
      throw new GitHubError(`HTTP ${res.status}: ${body}`, res.status, body)
    }

    const json = (await res.json()) as {
      data?: T
      errors?: Array<{ message: string }>
    }

    // GitHub returns partial data + errors[] when a single field is forbidden
    // (e.g. statusCheckRollup when the PAT lacks repo:status). Only throw when
    // there is no usable data; otherwise surface the errors via console and
    // return what we got.
    if (!json.data) {
      if (json.errors && json.errors.length > 0) {
        throw new GitHubError(
          json.errors.map((e) => e.message).join('; '),
          200,
          json.errors,
        )
      }
      throw new GitHubError('Empty response from GitHub', 200)
    }

    if (json.errors && json.errors.length > 0) {
      console.warn(
        'GitHub GraphQL partial errors:',
        json.errors.map((e) => e.message),
      )
    }

    return { data: json.data, rateLimit }
  }

  if (lastError instanceof GitHubError) throw lastError
  throw new GitHubError(
    lastError?.message ?? 'GitHub request failed after retries',
    0,
  )
}

interface RestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

/** REST call with retry/backoff. Used for the few endpoints GraphQL lacks (e.g. merge PR). */
export async function rest<T = unknown>(
  path: string,
  opts: RestOptions = {},
): Promise<{ data: T; rateLimit: RateLimit }> {
  const token = getToken()
  const method = opts.method ?? 'GET'
  let lastError: Error | null = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    let res: Response
    try {
      res = await fetch(`${REST_BASE}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: opts.signal,
      })
    } catch (e) {
      if (opts.signal?.aborted) throw e
      if (attempt === MAX_RETRIES - 1) throw e
      lastError = e as Error
      await sleep(2 ** attempt * 500)
      continue
    }

    const rateLimit = parseRateLimit(res)

    if (res.status === 401)
      throw new GitHubError('Token invalid', 401, undefined, 'auth')

    if (res.status === 403 || res.status === 429) {
      const { permission, body, message } = await classify403(res)
      if (permission) {
        throw new GitHubError(
          message ?? 'Forbidden',
          res.status,
          body,
          'forbidden',
        )
      }
      lastError = new GitHubError(
        `HTTP ${res.status} ${res.statusText}`,
        res.status,
        body,
        'rate-limit',
      )
      const retryAfter = res.headers.get('retry-after')
      await sleep(retryAfter ? Number(retryAfter) * 1000 : 2 ** attempt * 1000)
      continue
    }

    if (res.status >= 500) {
      lastError = new GitHubError(
        `HTTP ${res.status} ${res.statusText}`,
        res.status,
      )
      await sleep(2 ** attempt * 500)
      continue
    }

    if (!res.ok) {
      const body = await res.text()
      throw new GitHubError(`HTTP ${res.status}: ${body}`, res.status, body)
    }

    // 204 No Content
    const data =
      res.status === 204 ? (undefined as T) : ((await res.json()) as T)
    return { data, rateLimit }
  }

  if (lastError instanceof GitHubError) throw lastError
  throw new GitHubError(
    lastError?.message ?? 'REST request failed after retries',
    0,
  )
}
