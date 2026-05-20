import { Bug, HelpCircle, MessageCircle, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { IssueIntent } from '@/lib/llm'

interface Props {
  intent: IssueIntent
}

const META: Record<
  IssueIntent,
  { label: string; icon: LucideIcon; className: string }
> = {
  bug: {
    label: 'Bug',
    icon: Bug,
    className:
      'border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] text-[var(--color-danger)]',
  },
  feature: {
    label: 'Feature',
    icon: Sparkles,
    className:
      'border-[color-mix(in_oklab,var(--color-accent)_40%,transparent)] bg-[color-mix(in_oklab,var(--color-accent)_15%,transparent)] text-[var(--color-accent)]',
  },
  question: {
    label: 'Question',
    icon: HelpCircle,
    className:
      'border-[var(--color-attention-border)] bg-[var(--color-attention-bg)] text-[var(--color-attention)]',
  },
  other: {
    label: 'Other',
    icon: MessageCircle,
    className:
      'border-[var(--color-border)] text-[var(--color-fg-muted)]',
  },
}

export function ToneChip({ intent }: Props) {
  const meta = META[intent]
  const Icon = meta.icon
  return (
    <span
      className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] uppercase tracking-wider font-semibold border rounded-full ${meta.className}`}
      title={`${meta.label} (LLM-classified)`}
    >
      <Icon className="w-2.5 h-2.5" aria-hidden />
      {meta.label}
    </span>
  )
}
