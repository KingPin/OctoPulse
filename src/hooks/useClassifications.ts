import { useEffect, useRef, useState } from 'react'
import { rest } from '@/lib/github/client'
import { useLLM } from './useLLM'
import type { IssueIntent } from '@/lib/llm'
import type { InboxItem } from '@/components/inbox/categorize'

export type ClassificationState = 'loading' | IssueIntent | null

interface IssueBodyResponse {
  body: string | null
}

interface UseClassificationsArgs {
  items: InboxItem[]
  isDemo: boolean
}

const DEMO_INTENTS: IssueIntent[] = ['bug', 'feature', 'question', 'other']

function demoIntent(id: string): IssueIntent {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  const idx = Math.abs(h) % DEMO_INTENTS.length
  return DEMO_INTENTS[idx]!
}

function parseRepo(nameWithOwner: string): { owner: string; name: string } | null {
  const idx = nameWithOwner.indexOf('/')
  if (idx < 1 || idx === nameWithOwner.length - 1) return null
  return {
    owner: nameWithOwner.slice(0, idx),
    name: nameWithOwner.slice(idx + 1),
  }
}

/**
 * Classify unanswered inbox items. Returns a Map keyed by item id.
 * Real mode runs items serially through the configured LLM with cached
 * results. Demo mode assigns deterministic intents per item id.
 */
export function useClassifications({
  items,
  isDemo,
}: UseClassificationsArgs): Map<string, ClassificationState> {
  const { isReady, getProvider } = useLLM()
  const [results, setResults] = useState<Map<string, ClassificationState>>(new Map())
  const cacheRef = useRef<Map<string, IssueIntent>>(new Map())
  const acRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const targets = items.filter((i) => i.category === 'unanswered' && !i.isPullRequest)

    if (targets.length === 0) {
      setResults(new Map())
      return
    }

    if (isDemo) {
      const map = new Map<string, ClassificationState>()
      for (const t of targets) map.set(t.id, demoIntent(t.id))
      setResults(map)
      return
    }

    if (!isReady) {
      setResults(new Map())
      return
    }

    const provider = getProvider()
    if (!provider) return

    acRef.current?.abort()
    const ac = new AbortController()
    acRef.current = ac

    const initial = new Map<string, ClassificationState>()
    for (const t of targets) {
      const cached = cacheRef.current.get(t.id)
      initial.set(t.id, cached ?? 'loading')
    }
    setResults(initial)

    ;(async () => {
      for (const t of targets) {
        if (ac.signal.aborted) return
        if (cacheRef.current.has(t.id)) continue

        const parsed = parseRepo(t.repoNameWithOwner)
        if (!parsed) continue

        try {
          const { data } = await rest<IssueBodyResponse>(
            `/repos/${parsed.owner}/${parsed.name}/issues/${t.number}`,
            { signal: ac.signal },
          )
          if (ac.signal.aborted) return
          const body = data.body ?? t.title
          const intent = await provider.classify(body, ac.signal)
          if (ac.signal.aborted) return

          cacheRef.current.set(t.id, intent)
          setResults((prev) => {
            const next = new Map(prev)
            next.set(t.id, intent)
            return next
          })
        } catch {
          if (ac.signal.aborted) return
          setResults((prev) => {
            const next = new Map(prev)
            next.set(t.id, null)
            return next
          })
        }
      }
    })()

    return () => ac.abort()
  }, [items, isDemo, isReady, getProvider])

  return results
}
