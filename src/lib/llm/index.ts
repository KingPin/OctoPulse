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
