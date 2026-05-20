import { useCallback, useEffect, useRef, useState } from 'react'
import { ExternalLink, Loader2, RefreshCw, Sparkles, X } from 'lucide-react'
import { useLLM } from '@/hooks/useLLM'
import { fetchThread, formatThreadForLLM } from '@/lib/github/threads'
import type { InboxItem } from '@/components/inbox/categorize'
import { toast } from '@/hooks/useToast'

interface Props {
  item: InboxItem | null
  isDemo: boolean
  onClose: () => void
}

type Status =
  | { kind: 'idle' }
  | { kind: 'loading'; phase: 'thread' | 'llm' }
  | { kind: 'ready'; bullets: string[] }
  | { kind: 'error'; message: string }

function demoBullets(item: InboxItem): string[] {
  return [
    `Thread is about ${item.title.toLowerCase()}.`,
    `Several comments back and forth — opener is @${item.authorLogin ?? 'unknown'}.`,
    `Maintainer action needed: review and respond.`,
  ]
}

function parseRepo(nameWithOwner: string): { owner: string; name: string } | null {
  const idx = nameWithOwner.indexOf('/')
  if (idx < 1 || idx === nameWithOwner.length - 1) return null
  return {
    owner: nameWithOwner.slice(0, idx),
    name: nameWithOwner.slice(idx + 1),
  }
}

export function SummarizerModal({ item, isDemo, onClose }: Props) {
  const { getProvider } = useLLM()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const acRef = useRef<AbortController | null>(null)

  const run = useCallback(async (current: InboxItem) => {
    acRef.current?.abort()
    const ac = new AbortController()
    acRef.current = ac
    const { signal } = ac

    setStatus({ kind: 'loading', phase: 'thread' })

    if (isDemo) {
      await new Promise((r) => setTimeout(r, 400))
      if (signal.aborted) return
      setStatus({ kind: 'loading', phase: 'llm' })
      await new Promise((r) => setTimeout(r, 600))
      if (signal.aborted) return
      setStatus({ kind: 'ready', bullets: demoBullets(current) })
      return
    }

    const provider = getProvider()
    if (!provider) {
      setStatus({
        kind: 'error',
        message: 'No LLM provider configured. Open Settings to add one.',
      })
      return
    }

    const parsed = parseRepo(current.repoNameWithOwner)
    if (!parsed) {
      setStatus({ kind: 'error', message: 'Could not parse repo path' })
      return
    }

    try {
      const messages = await fetchThread(parsed.owner, parsed.name, current.number, signal)
      if (signal.aborted) return
      setStatus({ kind: 'loading', phase: 'llm' })
      const bullets = await provider.summarize(formatThreadForLLM(messages), signal)
      if (signal.aborted) return
      if (bullets.length === 0) {
        setStatus({ kind: 'error', message: 'Got empty summary from provider' })
      } else {
        setStatus({ kind: 'ready', bullets })
      }
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      if (signal.aborted) return
      const msg = e instanceof Error ? e.message : 'Summarization failed'
      setStatus({ kind: 'error', message: msg })
      toast(msg, 'error')
    }
  }, [getProvider, isDemo])

  useEffect(() => {
    if (item) {
      run(item)
    } else {
      acRef.current?.abort()
      acRef.current = null
      setStatus({ kind: 'idle' })
    }
    return () => {
      acRef.current?.abort()
      acRef.current = null
    }
  }, [item, run])

  useEffect(() => {
    if (!item) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [item, onClose])

  if (!item) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="summarizer-title"
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-lg bg-[var(--color-canvas)] border border-[var(--color-border)] rounded-md shadow-2xl">
        <header className="flex items-start justify-between gap-3 px-5 py-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-[var(--color-accent)] shrink-0" aria-hidden />
            <div className="min-w-0">
              <h2 id="summarizer-title" className="text-sm font-semibold truncate">
                Thread summary
              </h2>
              <p className="text-xs text-[var(--color-fg-muted)] font-mono truncate">
                {item.repoNameWithOwner}#{item.number}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close summarizer"
            className="min-w-[36px] min-h-[36px] flex items-center justify-center text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] rounded-md"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </header>

        <div className="px-5 py-4 min-h-[140px]">
          <p className="text-sm font-semibold mb-3 truncate" title={item.title}>
            {item.title}
          </p>

          {status.kind === 'loading' && (
            <div className="flex items-center gap-2 text-sm text-[var(--color-fg-muted)]">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              {status.phase === 'thread'
                ? 'Fetching thread from GitHub…'
                : 'Asking the model to summarize…'}
            </div>
          )}

          {status.kind === 'error' && (
            <div
              role="alert"
              className="text-sm text-[var(--color-danger)] border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] rounded-md p-3"
            >
              {status.message}
            </div>
          )}

          {status.kind === 'ready' && (
            <ul className="space-y-2">
              {status.bullets.map((b, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-sm leading-relaxed"
                >
                  <span
                    aria-hidden
                    className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] shrink-0"
                  />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="flex items-center justify-between gap-2 px-5 py-3 border-t border-[var(--color-border)]">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)]"
          >
            View on GitHub
            <ExternalLink className="w-3 h-3" aria-hidden />
          </a>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => run(item)}
              disabled={status.kind === 'loading'}
              className="inline-flex items-center gap-1 min-h-[36px] px-3 text-sm border border-[var(--color-border)] rounded-md text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden />
              Re-summarize
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[36px] px-3 text-sm border border-[var(--color-accent)] bg-[var(--color-accent)] text-white rounded-md"
            >
              Done
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
