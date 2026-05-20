import { useState, type FormEvent } from 'react'
import { ExternalLink, Loader2, KeyRound, Activity } from 'lucide-react'
import {
  validateToken,
  hasRequiredScopes,
  CREATE_CLASSIC_TOKEN_URL,
  CREATE_FINE_GRAINED_TOKEN_URL,
} from '@/lib/github/pat'
import type { Viewer } from '@/lib/github/types'
import { toast } from '@/hooks/useToast'

interface Props {
  onSignedIn: (token: string, viewer: Viewer) => void
  onTryDemo?: () => void
}

export function PatEntryScreen({ onSignedIn, onTryDemo }: Props) {
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

    if (!hasRequiredScopes(result.scopes)) {
      setError(
        `Token is missing required scopes. Got: ${result.scopes.join(', ') || '(none)'}. Need: repo, read:org.`,
      )
      return
    }

    toast(`Signed in as @${result.viewer.login}`, 'success')
    onSignedIn(trimmed, result.viewer)
  }

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
          <p className="text-sm text-[var(--color-fg-muted)] mb-5">
            Paste a Personal Access Token. It stays in your browser — never
            leaves your machine.
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
              {submitting ? 'Validating…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[var(--color-border-muted)] text-xs text-[var(--color-fg-muted)] space-y-2">
            <p className="font-semibold uppercase tracking-wider text-[10px]">
              Need a token?
            </p>
            <a
              href={CREATE_CLASSIC_TOKEN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-[var(--color-fg-default)]"
            >
              Create classic PAT (pre-filled scopes)
              <ExternalLink className="w-3 h-3" aria-hidden />
            </a>
            <a
              href={CREATE_FINE_GRAINED_TOKEN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-[var(--color-fg-default)]"
            >
              Create fine-grained PAT
              <ExternalLink className="w-3 h-3" aria-hidden />
            </a>
            <p className="pt-1">
              For fine-grained: grant <strong>Issues</strong>,{' '}
              <strong>Pull requests</strong> (Read &amp; write),{' '}
              <strong>Contents</strong>, <strong>Metadata</strong>, and{' '}
              <strong>Members</strong> (Read).
            </p>
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
