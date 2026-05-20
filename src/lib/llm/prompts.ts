import type { IssueIntent } from './types'

export const SUMMARIZE_SYSTEM = `You summarize GitHub issue and pull-request comment threads for a maintainer who is triaging their inbox.
- Respond with exactly 3 short bullet points.
- Each bullet is one line, plain text, no markdown bullet characters.
- Capture: the core ask, what's been decided or blocked, what still needs the maintainer.
- Do not invent details. Be concise.`

export function summarizePrompt(thread: string): string {
  return `Summarize this thread in 3 bullets:\n\n${thread.slice(0, 12000)}`
}

export const CLASSIFY_SYSTEM = `Classify a GitHub issue body into one of these intents:
- bug: something is broken or behaving incorrectly
- feature: a new capability is being requested
- question: someone is asking how to do something
- other: anything that doesn't clearly fit the above (discussion, chore, meta)

Respond with ONLY the single word: bug, feature, question, or other.`

export function classifyPrompt(issueBody: string): string {
  return issueBody.slice(0, 4000)
}

export function parseIntent(raw: string): IssueIntent {
  const norm = raw.trim().toLowerCase().split(/\s+/)[0] ?? ''
  if (norm === 'bug' || norm === 'feature' || norm === 'question') return norm
  return 'other'
}

export function parseBullets(raw: string): string[] {
  const lines = raw
    .split('\n')
    .map((l) => l.replace(/^[\s\-*•\d.)\]]+/, '').trim())
    .filter((l) => l.length > 0)
  return lines.slice(0, 3)
}
