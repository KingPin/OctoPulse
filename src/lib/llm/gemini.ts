import {
  CLASSIFY_SYSTEM,
  SUMMARIZE_SYSTEM,
  classifyPrompt,
  parseBullets,
  parseIntent,
  summarizePrompt,
} from './prompts'
import { LLMError, type IssueIntent, type LLMConfig, type LLMProvider } from './types'

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> }
  }>
}

async function generate(
  config: LLMConfig,
  systemInstruction: string,
  userPrompt: string,
  maxOutputTokens: number,
  signal?: AbortSignal,
): Promise<string> {
  const url = `${config.baseUrl.replace(/\/$/, '')}/models/${encodeURIComponent(
    config.model,
  )}:generateContent`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': config.apiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { maxOutputTokens, temperature: 0.2 },
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
  const json = (await res.json()) as GeminiResponse
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text
  if (typeof text !== 'string') {
    throw new LLMError('Empty response from Gemini')
  }
  return text
}

export function createGemini(config: LLMConfig): LLMProvider {
  return {
    async summarize(thread: string, signal?: AbortSignal): Promise<string[]> {
      const out = await generate(
        config,
        SUMMARIZE_SYSTEM,
        summarizePrompt(thread),
        300,
        signal,
      )
      return parseBullets(out)
    },
    async classify(issueBody: string, signal?: AbortSignal): Promise<IssueIntent> {
      const out = await generate(
        config,
        CLASSIFY_SYSTEM,
        classifyPrompt(issueBody),
        5,
        signal,
      )
      return parseIntent(out)
    },
    async test(signal?: AbortSignal): Promise<void> {
      await generate(
        config,
        'You answer with one word.',
        'ping',
        5,
        signal,
      )
    },
  }
}
