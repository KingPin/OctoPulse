import { useMemo, useState } from 'react'
import { Inbox } from 'lucide-react'
import { categorize, type InboxItem } from './categorize'
import { InboxRow } from './InboxRow'
import { ConfirmModal } from '@/components/shell/ConfirmModal'
import { SummarizerModal } from '@/components/llm/SummarizerModal'
import { closeIssue, mergePullRequest } from '@/lib/github/mutations'
import { useLLM } from '@/hooks/useLLM'
import { useClassifications } from '@/hooks/useClassifications'
import { toast } from '@/hooks/useToast'
import type { RepoSnapshot } from '@/types/github'

interface Props {
  snapshots: RepoSnapshot[]
  viewerLogin: string
  isDemo: boolean
  onMutated: () => void
}

function parseRepo(nameWithOwner: string): { owner: string; name: string } | null {
  const idx = nameWithOwner.indexOf('/')
  if (idx < 1 || idx === nameWithOwner.length - 1) return null
  return {
    owner: nameWithOwner.slice(0, idx),
    name: nameWithOwner.slice(idx + 1),
  }
}

export function ActionInbox({ snapshots, viewerLogin, isDemo, onMutated }: Props) {
  const items = useMemo(
    () => categorize(snapshots, viewerLogin),
    [snapshots, viewerLogin],
  )

  const [target, setTarget] = useState<InboxItem | null>(null)
  const [summarizeTarget, setSummarizeTarget] = useState<InboxItem | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const { isReady: llmReady } = useLLM()
  const canSummarize = isDemo || llmReady
  const classifications = useClassifications({ items, isDemo })

  const runAction = async () => {
    if (!target) return
    const parsed = parseRepo(target.repoNameWithOwner)
    if (!parsed) {
      toast('Could not parse repo', 'error')
      return
    }
    const id = target.id

    if (isDemo) {
      setTarget(null)
      toast('Demo mode — no real API call made', 'info')
      return
    }

    setBusyId(id)
    try {
      if (target.isPullRequest) {
        await mergePullRequest(parsed.owner, parsed.name, target.number)
        toast(`Merged ${target.repoNameWithOwner}#${target.number}`, 'success')
      } else {
        await closeIssue(parsed.owner, parsed.name, target.number)
        toast(`Closed ${target.repoNameWithOwner}#${target.number}`, 'success')
      }
      setTarget(null)
      onMutated()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Action failed'
      toast(msg, 'error')
    } finally {
      setBusyId(null)
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-8 border border-dashed border-[var(--color-border)] rounded-md text-[var(--color-fg-muted)]">
        <Inbox className="w-6 h-6 text-[var(--color-success)]" aria-hidden />
        <p className="text-sm">Inbox zero — nothing needs you right now.</p>
      </div>
    )
  }

  return (
    <>
      <div className="border border-[var(--color-border)] rounded-md overflow-hidden">
        {items.map((item) => {
          const canAct =
            (item.isPullRequest && item.category !== 'blocked') ||
            !item.isPullRequest
          return (
            <InboxRow
              key={item.id}
              item={item}
              canAct={canAct}
              isBusy={busyId === item.id}
              onAct={() => setTarget(item)}
              canSummarize={canSummarize}
              onSummarize={() => setSummarizeTarget(item)}
              classification={classifications.get(item.id)}
            />
          )
        })}
      </div>

      <ConfirmModal
        open={target !== null}
        title={
          target?.isPullRequest
            ? `Merge ${target.repoNameWithOwner}#${target.number}?`
            : target
              ? `Close ${target.repoNameWithOwner}#${target.number}?`
              : ''
        }
        description={
          target?.isPullRequest
            ? `This merges the PR using the default merge method. Make sure checks have passed.`
            : `This closes the issue without leaving a comment. You can reopen it on GitHub.`
        }
        confirmLabel={target?.isPullRequest ? 'Merge' : 'Close issue'}
        variant={target?.isPullRequest ? 'default' : 'danger'}
        busy={busyId !== null}
        onConfirm={runAction}
        onCancel={() => setTarget(null)}
      />

      <SummarizerModal
        item={summarizeTarget}
        isDemo={isDemo}
        onClose={() => setSummarizeTarget(null)}
      />
    </>
  )
}
