import { useMemo } from 'react'
import { Inbox } from 'lucide-react'
import { categorize } from './categorize'
import { InboxRow } from './InboxRow'
import type { RepoSnapshot } from '@/types/github'

interface Props {
  snapshots: RepoSnapshot[]
  viewerLogin: string
}

export function ActionInbox({ snapshots, viewerLogin }: Props) {
  const items = useMemo(
    () => categorize(snapshots, viewerLogin),
    [snapshots, viewerLogin],
  )

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-8 border border-dashed border-[var(--color-border)] rounded-md text-[var(--color-fg-muted)]">
        <Inbox className="w-6 h-6 text-[var(--color-success)]" aria-hidden />
        <p className="text-sm">Inbox zero — nothing needs you right now.</p>
      </div>
    )
  }

  return (
    <div className="border border-[var(--color-border)] rounded-md overflow-hidden">
      {items.map((item) => (
        <InboxRow key={item.id} item={item} />
      ))}
    </div>
  )
}
