import { useState, type FormEvent, type ReactNode } from 'react'
import {
  ExternalLink,
  Loader2,
  KeyRound,
  Activity,
  ShieldCheck,
  Eye,
  PenLine,
} from 'lucide-react'
import {
  validateToken,
  hasRequiredScopes,
  CREATE_CLASSIC_TOKEN_URL,
  CREATE_FINE_GRAINED_TOKEN_URL,
  FINE_GRAINED_PERMISSIONS,
  CLASSIC_SCOPES_READWRITE,
  type PatMode,
} from '@/lib/github/pat'
import type { Viewer } from '@/lib/github/types'
import { toast } from '@/hooks/useToast'

interface Props {
  onSignedIn: (token: string, viewer: Viewer, mode: PatMode) => void
  onTryDemo?: () => void
}

const LANE_COPY: Record<PatMode, { title: string; why: string }> = {
  readonly: {
    title: 'Read-only',
    why: 'OctoPulse can list your repos, PRs, and issues. No merge or close actions.',
  },
  readwrite: {
    title: 'Read & write',
    why: 'Adds one-click Merge PR and Close Issue from the inbox.',
  },
}

export function PatEntryScreen({ onSignedIn, onTryDemo }: Props) {
  const [mode, setMode] = useState<PatMode>('readwrite')
  const [token, setToken] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = token.trim()
    if (!trimmed) {
      setError('Paste a token first')
      return
    }
    setSubmitting(true)
    setError(null)

    const result = await validateToken(trimmed)
    setSubmitting(false)

    if (!result.ok) {
      const msg =
        result.reason === 'unauthorized'
          ? 'That token was rejected. Double-check it was copied in full.'
          : result.reason === 'network'
            ? 'Network error contacting GitHub.'
            : result.message
      setError(msg)
      return
    }

    if (!hasRequiredScopes(result.scopes, mode)) {
      setError(
        `Token is missing required scopes. Got: ${result.scopes.join(', ') || '(none)'}. Need: ${CLASSIC_SCOPES_READWRITE.slice(0, 2).join(', ')}.`,
      )
      return
    }

    toast(`Signed in as @${result.viewer.login}`, 'success')
    onSignedIn(trimmed, result.viewer, mode)
  }

  const permissions = FINE_GRAINED_PERMISSIONS[mode]
  const laneCopy = LANE_COPY[mode]

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Activity
            className="w-7 h-7 text-[var(--color-accent)]"
            aria-hidden
          />
          <h1 className="text-2xl font-semibold tracking-tight">OctoPulse</h1>
        </div>

        <div className="border border-[var(--color-border)] rounded-lg bg-[var(--color-canvas-subtle)] p-6">
          <div className="flex items-center gap-2 mb-2">
            <KeyRound
              className="w-4 h-4 text-[var(--color-fg-muted)]"
              aria-hidden
            />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
              Connect your GitHub
            </h2>
          </div>

          <div
            className="mb-5 p-3 rounded-md border border-[var(--color-border-muted)] bg-[var(--color-canvas)] text-xs text-[var(--color-fg-muted)] flex gap-2"
            role="note"
          >
            <ShieldCheck
              className="w-4 h-4 mt-[1px] shrink-0 text-[var(--color-success)]"
              aria-hidden
            />
            <p>
              Your token never leaves this browser. OctoPulse is a static client
              — there is no OctoPulse server, no analytics, no telemetry. The
              token lives in localStorage and is sent only to{' '}
              <code className="font-mono">api.github.com</code> from your
              machine.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Token access level"
            className="grid grid-cols-2 gap-1 p-1 mb-4 rounded-md bg-[var(--color-canvas)] border border-[var(--color-border-muted)]"
          >
            <LaneTab
              active={mode === 'readonly'}
              onClick={() => setMode('readonly')}
              icon={<Eye className="w-3.5 h-3.5" aria-hidden />}
              label="Read-only"
            />
            <LaneTab
              active={mode === 'readwrite'}
              onClick={() => setMode('readwrite')}
              icon={<PenLine className="w-3.5 h-3.5" aria-hidden />}
              label="Read & write"
            />
          </div>

          <p className="text-xs text-[var(--color-fg-muted)] mb-4">
            {laneCopy.why}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="pat" className="sr-only">
                Personal Access Token
              </label>
              <input
                id="pat"
                type="password"
                autoComplete="off"
                spellCheck={false}
                placeholder="ghp_… or github_pat_…"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={submitting}
                className="w-full px-3 py-2 text-sm font-mono bg-[var(--color-canvas)] border border-[var(--color-border)] rounded-md focus:outline-none focus:border-[var(--color-accent)] disabled:opacity-50"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'pat-error' : undefined}
              />
              {error && (
                <p
                  id="pat-error"
                  role="alert"
                  className="mt-2 text-xs text-[var(--color-danger)]"
                >
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 bg-[var(--color-accent)] text-white rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {submitting && (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              )}
              {submitting ? 'Validating…' : `Sign in (${laneCopy.title})`}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[var(--color-border-muted)] text-xs text-[var(--color-fg-muted)] space-y-3">
            <div>
              <p className="font-semibold uppercase tracking-wider text-[10px] mb-2">
                Fine-grained PAT permissions ({laneCopy.title})
              </p>
              <ul className="space-y-1">
                {permissions.map((p) => (
                  <li
                    key={p.name}
                    className="flex justify-between gap-2 font-mono"
                  >
                    <span>{p.name}</span>
                    <span className="text-[var(--color-fg-default)]">
                      {p.access}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2 pt-1">
              <p className="font-semibold uppercase tracking-wider text-[10px]">
                Create one
              </p>
              <a
                href={CREATE_FINE_GRAINED_TOKEN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-[var(--color-fg-default)]"
              >
                Create fine-grained PAT (recommended)
                <ExternalLink className="w-3 h-3" aria-hidden />
              </a>
              {mode === 'readwrite' && (
                <a
                  href={CREATE_CLASSIC_TOKEN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-[var(--color-fg-default)]"
                >
                  Create classic PAT (pre-filled scopes)
                  <ExternalLink className="w-3 h-3" aria-hidden />
                </a>
              )}
              {mode === 'readonly' && (
                <p className="text-[11px] opacity-80">
                  Classic PATs have no clean read-only scope for private repos
                  — use fine-grained.
                </p>
              )}
            </div>
          </div>
        </div>

        {onTryDemo && (
          <button
            type="button"
            onClick={onTryDemo}
            className="w-full mt-4 min-h-[44px] text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] underline-offset-4 hover:underline"
          >
            Try demo mode without a token →
          </button>
        )}
      </div>
    </main>
  )
}

interface LaneTabProps {
  active: boolean
  onClick: () => void
  icon: ReactNode
  label: string
}

function LaneTab({ active, onClick, icon, label }: LaneTabProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 min-h-[36px] px-3 text-xs font-medium rounded transition-colors ${
        active
          ? 'bg-[var(--color-canvas-subtle)] text-[var(--color-fg-default)] shadow-sm border border-[var(--color-border)]'
          : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)]'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
