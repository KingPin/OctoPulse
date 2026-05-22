import type { ValidationResult, ValidationError, Viewer } from './types'

const API_BASE = 'https://api.github.com'

export type PatMode = 'readonly' | 'readwrite'

export interface PermissionItem {
  name: string
  access: 'Read' | 'Read & write'
}

/** Fine-grained PAT permissions per lane. Drives the PAT screen UI. */
export const FINE_GRAINED_PERMISSIONS: Record<PatMode, PermissionItem[]> = {
  readonly: [
    { name: 'Contents', access: 'Read' },
    { name: 'Issues', access: 'Read' },
    { name: 'Pull requests', access: 'Read' },
    { name: 'Metadata', access: 'Read' },
    { name: 'Members', access: 'Read' },
  ],
  readwrite: [
    { name: 'Contents', access: 'Read & write' },
    { name: 'Issues', access: 'Read & write' },
    { name: 'Pull requests', access: 'Read & write' },
    { name: 'Metadata', access: 'Read' },
    { name: 'Members', access: 'Read' },
  ],
}

/** Classic scopes for read & write. (Classic PATs have no clean read-only equivalent for private repos.) */
export const CLASSIC_SCOPES_READWRITE = ['repo', 'read:org', 'read:user'] as const

/** Validate a PAT by calling GET /user. Works for both classic and fine-grained tokens. */
export async function validateToken(
  token: string,
): Promise<ValidationResult | ValidationError> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })
  } catch (e) {
    return {
      ok: false,
      reason: 'network',
      message: e instanceof Error ? e.message : 'Network error',
    }
  }

  if (res.status === 401) {
    return {
      ok: false,
      reason: 'unauthorized',
      message: 'Token is invalid or expired',
    }
  }

  if (!res.ok) {
    return {
      ok: false,
      reason: 'unknown',
      message: `Unexpected status ${res.status}`,
    }
  }

  const body = (await res.json()) as {
    login: string
    id: number
    avatar_url: string
    name: string | null
  }

  const viewer: Viewer = {
    login: body.login,
    id: body.id,
    avatarUrl: body.avatar_url,
    name: body.name,
  }

  const scopesHeader = res.headers.get('x-oauth-scopes') ?? ''
  const scopes = scopesHeader
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const rl = res.headers.get('x-ratelimit-remaining')
  const rateLimitRemaining = rl ? Number(rl) : null

  return { ok: true, viewer, scopes, rateLimitRemaining }
}

/**
 * Whether a classic-PAT scope set covers what OctoPulse needs for the given lane.
 * Fine-grained tokens return no scopes header — we can't verify them here, so they pass.
 *
 * Read-only lane: no scope enforcement. Users opting into read-only know their token
 * may have limited reach (e.g. only public repos). If it can't see a repo, the repo
 * just won't appear; we don't need to gate sign-in on that.
 */
export function hasRequiredScopes(scopes: string[], mode: PatMode): boolean {
  if (scopes.length === 0) return true // fine-grained — can't verify
  if (mode === 'readonly') return true
  const has = (s: string) => scopes.includes(s)
  return has('repo') && (has('read:org') || has('admin:org'))
}

export const CREATE_CLASSIC_TOKEN_URL =
  'https://github.com/settings/tokens/new' +
  '?scopes=' +
  encodeURIComponent('repo,read:org,read:user') +
  '&description=' +
  encodeURIComponent('OctoPulse')

export const CREATE_FINE_GRAINED_TOKEN_URL =
  'https://github.com/settings/personal-access-tokens/new'
