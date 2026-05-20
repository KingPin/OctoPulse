import { useCallback, useEffect, useState } from 'react'
import * as storage from '@/lib/storage'
import {
  createProvider,
  defaultConfig,
  isConfigured,
  type LLMConfig,
  type LLMProvider,
  type LLMProviderId,
} from '@/lib/llm'

interface UseLLMResult {
  config: LLMConfig
  isReady: boolean
  setProviderId: (id: LLMProviderId) => void
  update: (patch: Partial<LLMConfig>) => void
  save: () => boolean
  clear: () => void
  /** Returns a provider instance built from the *saved* config, or null. */
  getProvider: () => LLMProvider | null
}

export function useLLM(): UseLLMResult {
  const [config, setConfig] = useState<LLMConfig>(
    () => storage.get<LLMConfig>('llmConfig') ?? defaultConfig('openai'),
  )

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'octopulse:llmConfig') {
        setConfig(storage.get<LLMConfig>('llmConfig') ?? defaultConfig('openai'))
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setProviderId = useCallback((id: LLMProviderId) => {
    setConfig((prev) => {
      const fresh = defaultConfig(id)
      return { ...fresh, apiKey: prev.providerId === id ? prev.apiKey : '' }
    })
  }, [])

  const update = useCallback((patch: Partial<LLMConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }))
  }, [])

  const save = useCallback(() => {
    return storage.set<LLMConfig>('llmConfig', config)
  }, [config])

  const clear = useCallback(() => {
    storage.remove('llmConfig')
    setConfig(defaultConfig('openai'))
  }, [])

  const getProvider = useCallback((): LLMProvider | null => {
    const saved = storage.get<LLMConfig>('llmConfig')
    return isConfigured(saved) ? createProvider(saved) : null
  }, [])

  return {
    config,
    isReady: isConfigured(config),
    setProviderId,
    update,
    save,
    clear,
    getProvider,
  }
}
