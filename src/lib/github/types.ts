export interface Viewer {
  login: string
  id: number
  avatarUrl: string
  name: string | null
}

export interface ValidationResult {
  ok: true
  viewer: Viewer
  /** OAuth scopes from x-oauth-scopes (classic PATs only; empty for fine-grained) */
  scopes: string[]
  rateLimitRemaining: number | null
}

export interface ValidationError {
  ok: false
  /** 'unauthorized' = 401, 'network' = fetch threw, 'unknown' = anything else */
  reason: 'unauthorized' | 'network' | 'unknown'
  message: string
}
