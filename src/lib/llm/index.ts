import { createGemini } from './gemini'
import { createOpenAICompatible } from './openaiCompatible'
import { PROVIDER_META, type LLMConfig, type LLMProvider, type LLMProviderId } from './types'

export { PROVIDER_META, type LLMConfig, type LLMProvider, type LLMProviderId } from './types'
export type { IssueIntent } from './types'
export { LLMError } from './types'

export function createProvider(config: LLMConfig): LLMProvider {
  if (config.providerId === 'gemini') return createGemini(config)
  return createOpenAICompatible(config)
}

export function defaultConfig(providerId: LLMProviderId): LLMConfig {
  const meta = PROVIDER_META[providerId]
  return {
    providerId,
    apiKey: '',
    baseUrl: meta.defaultBaseUrl,
    model: meta.defaultModel,
  }
}

export function isConfigured(config: LLMConfig | null): config is LLMConfig {
  return !!config && config.apiKey.trim().length > 0
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

export interface BaseUrlCheck {
  ok: boolean
  host: string | null
  reason?: string
}

export function checkBaseUrl(raw: string): BaseUrlCheck {
  const trimmed = raw.trim()
  if (!trimmed) return { ok: false, host: null, reason: 'Base URL is required' }
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return { ok: false, host: null, reason: 'Not a valid URL' }
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { ok: false, host: url.host, reason: `Unsupported protocol ${url.protocol}` }
  }
  const isLocal = LOCAL_HOSTS.has(url.hostname)
  if (url.protocol !== 'https:' && !isLocal) {
    return {
      ok: false,
      host: url.host,
      reason: 'Use https:// (or a localhost URL) — your API key would be sent in cleartext otherwise',
    }
  }
  return { ok: true, host: url.host }
}
