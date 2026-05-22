import { useCallback, useEffect, useState } from 'react'
import * as storage from '@/lib/storage'
import type { PatMode } from '@/lib/github/pat'

const CHANGE_EVENT = 'octopulse:pat-mode-change'

function read(): PatMode {
  // Legacy sessions that signed in before patMode existed default to 'readwrite'
  // so they don't suddenly lose access to merge/close.
  const stored = storage.get<PatMode>('patMode')
  return stored === 'readonly' ? 'readonly' : 'readwrite'
}

export function setPatMode(mode: PatMode): void {
  storage.set('patMode', mode)
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT))
}

export function usePatMode(): [PatMode, (m: PatMode) => void] {
  const [mode, setMode] = useState<PatMode>(read)

  useEffect(() => {
    const sync = () => setMode(read())
    window.addEventListener(CHANGE_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const update = useCallback((m: PatMode) => setPatMode(m), [])
  return [mode, update]
}

export function useWritesEnabled(): boolean {
  const [mode] = usePatMode()
  return mode === 'readwrite'
}
