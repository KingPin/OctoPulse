export type LLMProviderId =
  | 'openai'
  | 'groq'
  | 'openrouter'
  | 'gemini'
  | 'custom'

export type IssueIntent = 'bug' | 'feature' | 'question' | 'other'

export interface LLMConfig {
  providerId: LLMProviderId
  apiKey: string
  baseUrl: string
  model: string
}

export interface LLMProvider {
  /** Summarize a long comment thread into 3 short bullets. */
  summarize(thread: string, signal?: AbortSignal): Promise<string[]>
  /** Classify the intent of an issue body. */
  classify(issueBody: string, signal?: AbortSignal): Promise<IssueIntent>
  /** Cheap 1-token completion used by "Test connection". */
  test(signal?: AbortSignal): Promise<void>
}

export interface ProviderMeta {
  id: LLMProviderId
  label: string
  defaultBaseUrl: string
  defaultModel: string
  /** When true, baseUrl is hidden in settings (provider doesn't use it). */
  hidesBaseUrl?: boolean
}

export const PROVIDER_META: Record<LLMProviderId, ProviderMeta> = {
  openai: {
    id: 'openai',
    label: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
  },
  groq: {
    id: 'groq',
    label: 'Groq',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
  },
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openrouter/auto',
  },
  gemini: {
    id: 'gemini',
    label: 'Gemini',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-2.0-flash',
    hidesBaseUrl: true,
  },
  custom: {
    id: 'custom',
    label: 'Custom (OpenAI-compatible)',
    defaultBaseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3',
  },
}

export class LLMError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'LLMError'
    this.status = status
  }
}
