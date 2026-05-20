import { useMemo, useState } from 'react'
import { AlertTriangle, Loader2, Plug } from 'lucide-react'
import { useLLM } from '@/hooks/useLLM'
import {
  checkBaseUrl,
  createProvider,
  PROVIDER_META,
  type LLMProviderId,
} from '@/lib/llm'
import { toast } from '@/hooks/useToast'

const PROVIDER_ORDER: LLMProviderId[] = [
  'openai',
  'groq',
  'openrouter',
  'gemini',
  'custom',
]

export function LLMSettings() {
  const { config, setProviderId, update, save, clear } = useLLM()
  const meta = PROVIDER_META[config.providerId]
  const [testing, setTesting] = useState(false)
  const [dirty, setDirty] = useState(false)

  const baseUrlCheck = useMemo(() => checkBaseUrl(config.baseUrl), [config.baseUrl])

  const onSave = () => {
    if (!baseUrlCheck.ok) {
      toast(baseUrlCheck.reason ?? 'Invalid base URL', 'error', 6000)
      return
    }
    const ok = save()
    if (!ok) {
      toast(
        'Settings could not be saved — localStorage may be full or blocked.',
        'error',
        6000,
      )
      return
    }
    setDirty(false)
    toast('LLM settings saved', 'success', 2000)
  }

  const onClear = () => {
    clear()
    setDirty(false)
    toast('LLM settings cleared', 'info', 2000)
  }

  const onTest = async () => {
    if (!config.apiKey.trim()) {
      toast('Add an API key first', 'warning')
      return
    }
    setTesting(true)
    try {
      const provider = createProvider(config)
      await provider.test()
      toast(`Connected to ${meta.label}`, 'success')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Connection failed'
      toast(`Test failed: ${msg}`, 'error', 6000)
    } finally {
      setTesting(false)
    }
  }

  const onChange = <K extends 'apiKey' | 'baseUrl' | 'model'>(
    key: K,
    value: string,
  ) => {
    update({ [key]: value })
    setDirty(true)
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-xs text-[var(--color-fg-muted)] block mb-1">
          Provider
        </span>
        <select
          value={config.providerId}
          onChange={(e) => {
            setProviderId(e.target.value as LLMProviderId)
            setDirty(true)
          }}
          className="w-full min-h-[36px] px-2 text-sm bg-[var(--color-canvas-subtle)] border border-[var(--color-border)] rounded-md"
        >
          {PROVIDER_ORDER.map((id) => (
            <option key={id} value={id}>
              {PROVIDER_META[id].label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-xs text-[var(--color-fg-muted)] block mb-1">
          API key
        </span>
        <input
          type="password"
          value={config.apiKey}
          onChange={(e) => onChange('apiKey', e.target.value)}
          placeholder={meta.id === 'gemini' ? 'AIza…' : 'sk-…'}
          autoComplete="off"
          className="w-full min-h-[36px] px-2 text-sm font-mono bg-[var(--color-canvas-subtle)] border border-[var(--color-border)] rounded-md"
        />
      </label>

      {!meta.hidesBaseUrl && (
        <label className="block">
          <span className="text-xs text-[var(--color-fg-muted)] block mb-1">
            Base URL
          </span>
          <input
            type="url"
            value={config.baseUrl}
            onChange={(e) => onChange('baseUrl', e.target.value)}
            className="w-full min-h-[36px] px-2 text-sm font-mono bg-[var(--color-canvas-subtle)] border border-[var(--color-border)] rounded-md"
          />
          {baseUrlCheck.ok ? (
            <span className="mt-1 block text-[10px] text-[var(--color-fg-subtle)]">
              Your API key will be sent to{' '}
              <span className="font-mono">{baseUrlCheck.host}</span>.
            </span>
          ) : (
            <span className="mt-1 flex items-start gap-1 text-[10px] text-[var(--color-danger)]">
              <AlertTriangle className="w-3 h-3 shrink-0 mt-px" aria-hidden />
              <span>{baseUrlCheck.reason}</span>
            </span>
          )}
        </label>
      )}

      <label className="block">
        <span className="text-xs text-[var(--color-fg-muted)] block mb-1">
          Model
        </span>
        <input
          type="text"
          value={config.model}
          onChange={(e) => onChange('model', e.target.value)}
          className="w-full min-h-[36px] px-2 text-sm font-mono bg-[var(--color-canvas-subtle)] border border-[var(--color-border)] rounded-md"
        />
      </label>

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={onTest}
          disabled={testing || !config.apiKey.trim()}
          className="inline-flex items-center gap-1 min-h-[36px] px-3 text-sm border border-[var(--color-border)] rounded-md text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] disabled:opacity-50"
        >
          {testing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
          ) : (
            <Plug className="w-3.5 h-3.5" aria-hidden />
          )}
          Test connection
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!dirty}
          className="min-h-[36px] px-3 text-sm border border-[var(--color-accent)] bg-[var(--color-accent)] text-white rounded-md disabled:opacity-50"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onClear}
          className="min-h-[36px] px-3 text-sm border border-[var(--color-border)] rounded-md text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)]"
        >
          Clear
        </button>
      </div>

      <p className="text-[10px] text-[var(--color-fg-subtle)] leading-snug">
        Keys are stored only in this browser's localStorage and sent directly
        to the provider — never to any OctoPulse server.
      </p>
    </div>
  )
}
