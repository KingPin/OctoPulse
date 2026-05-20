import {
  CLASSIFY_SYSTEM,
  SUMMARIZE_SYSTEM,
  classifyPrompt,
  parseBullets,
  parseIntent,
  summarizePrompt,
} from './prompts'
import { LLMError, type IssueIntent, type LLMConfig, type LLMProvider } from './types'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatResponse {
  choices: Array<{ message: { content: string } }>
}

async function chat(
  config: LLMConfig,
  messages: ChatMessage[],
  maxTokens: number,
  signal?: AbortSignal,
): Promise<string> {
  const url = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.2,
    }),
    signal,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new LLMError(
      `${res.status} ${res.statusText}${body ? ` — ${body.slice(0, 200)}` : ''}`,
      res.status,
    )
  }
  const json = (await res.json()) as ChatResponse
  const content = json.choices[0]?.message?.content
  if (typeof content !== 'string') {
    throw new LLMError('Empty response from provider')
  }
  return content
}

export function createOpenAICompatible(config: LLMConfig): LLMProvider {
  return {
    async summarize(thread: string, signal?: AbortSignal): Promise<string[]> {
      const out = await chat(
        config,
        [
          { role: 'system', content: SUMMARIZE_SYSTEM },
          { role: 'user', content: summarizePrompt(thread) },
        ],
        300,
        signal,
      )
      return parseBullets(out)
    },
    async classify(issueBody: string, signal?: AbortSignal): Promise<IssueIntent> {
      const out = await chat(
        config,
        [
          { role: 'system', content: CLASSIFY_SYSTEM },
          { role: 'user', content: classifyPrompt(issueBody) },
        ],
        5,
        signal,
      )
      return parseIntent(out)
    },
    async test(signal?: AbortSignal): Promise<void> {
      await chat(
        config,
        [{ role: 'user', content: 'ping' }],
        1,
        signal,
      )
    },
  }
}
