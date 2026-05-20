import { RepoCard } from './RepoCard'
import type { RepoSnapshot } from '@/types/github'

interface Props {
  snapshots: RepoSnapshot[]
}

export function RepoPulseGrid({ snapshots }: Props) {
  if (snapshots.length === 0) {
    return (
      <div className="p-6 text-sm text-[var(--color-fg-muted)] border border-dashed border-[var(--color-border)] rounded-md text-center">
        No repos tracked yet.
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {snapshots.map((repo) => (
        <RepoCard key={repo.id} repo={repo} />
      ))}
    </div>
  )
}
