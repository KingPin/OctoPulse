import { useCallback, useEffect, useState } from 'react'
import * as storage from '@/lib/storage'
import { validateToken } from '@/lib/github/pat'
import type { Viewer } from '@/lib/github/types'

export type AuthState =
  | { status: 'loading' }
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

  useEffect(() => {
    const stored = storage.get<StoredAuth>('githubToken')
    if (!stored?.token) {
      setState({ status: 'signed-out' })
      return
    }
    // Re-validate the stored token in the background; sign in optimistically.
    setState({
      status: 'signed-in',
      token: stored.token,
      viewer: stored.viewer,
    })
    validateToken(stored.token).then((r) => {
      if (!r.ok && r.reason === 'unauthorized') {
        storage.remove('githubToken')
        setState({ status: 'signed-out' })
      }
    })
  }, [])

  const signIn = useCallback((token: string, viewer: Viewer) => {
    storage.set<StoredAuth>('githubToken', { token, viewer })
    setState({ status: 'signed-in', token, viewer })
  }, [])

  const signOut = useCallback(() => {
    storage.clear()
    setState({ status: 'signed-out' })
  }, [])

  return { state, signIn, signOut }
}
