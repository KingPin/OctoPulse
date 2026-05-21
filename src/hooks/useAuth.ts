import { useCallback, useEffect, useRef, useState } from 'react'
import * as storage from '@/lib/storage'
import { validateToken } from '@/lib/github/pat'
import type { Viewer } from '@/lib/github/types'
import { toast } from './useToast'

export type AuthState =
  | { status: 'loading' }
  | { status: 'validating'; token: string; viewer: Viewer }
  | { status: 'signed-out' }
  | { status: 'signed-in'; token: string; viewer: Viewer }

interface StoredAuth {
  token: string
  viewer: Viewer
}

export function useAuth(): {
  state: AuthState
  signIn: (token: string, viewer: Viewer) => void
  signOut: () => void
} {
  const [state, setState] = useState<AuthState>({ status: 'loading' })
  const generationRef = useRef(0)

  useEffect(() => {
    const stored = storage.get<StoredAuth>('githubToken')
    if (!stored?.token) {
      setState({ status: 'signed-out' })
      return
    }
    const gen = generationRef.current
    setState({
      status: 'validating',
      token: stored.token,
      viewer: stored.viewer,
    })
    validateToken(stored.token).then((r) => {
      if (generationRef.current !== gen) return
      if (!r.ok && r.reason === 'unauthorized') {
        storage.remove('githubToken')
        setState({ status: 'signed-out' })
        return
      }
      setState({
        status: 'signed-in',
        token: stored.token,
        viewer: stored.viewer,
      })
    })
  }, [])

  const signIn = useCallback((token: string, viewer: Viewer) => {
    generationRef.current += 1
    const persisted = storage.set<StoredAuth>('githubToken', { token, viewer })
    if (!persisted) {
      toast(
        'Signed in, but your token could not be saved — you will need to paste it again on reload.',
        'warning',
        8000,
      )
    }
    setState({ status: 'signed-in', token, viewer })
  }, [])

  const signOut = useCallback(() => {
    generationRef.current += 1
    storage.clear()
    setState({ status: 'signed-out' })
  }, [])

  return { state, signIn, signOut }
}
