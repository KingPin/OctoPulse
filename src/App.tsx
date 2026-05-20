import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTrackedRepos } from '@/hooks/useRepos'
import { ToastViewport } from '@/components/shell/Toast'
import { PatEntryScreen } from '@/components/onboarding/PatEntryScreen'
import { RepoPicker } from '@/components/onboarding/RepoPicker'
import { Dashboard } from '@/components/shell/Dashboard'
import { DEMO_VIEWER, DEMO_REPOS } from '@/lib/demo'
import type { Viewer } from '@/lib/github/types'
import type { TrackedRepo } from '@/hooks/useRepos'

const DEMO_TRACKED: TrackedRepo[] = DEMO_REPOS.map((r) => ({
  id: r.id,
  nameWithOwner: r.nameWithOwner,
  description: r.description,
  isPrivate: r.isPrivate,
  isFork: r.isFork,
  isArchived: r.isArchived,
  pushedAt: r.pushedAt,
}))

function App() {
  const { state, signIn, signOut } = useAuth()
  const repos = useTrackedRepos()
  const [demo, setDemo] = useState(false)

  if (state.status === 'loading' || repos.state.status === 'loading') {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2
          className="w-6 h-6 animate-spin text-[var(--color-fg-muted)]"
          aria-label="Loading"
        />
      </main>
    )
  }

  if (state.status === 'signed-out' && !demo) {
    return (
      <>
        <PatEntryScreen
          onSignedIn={signIn}
          onTryDemo={() => setDemo(true)}
        />
        <ToastViewport />
      </>
    )
  }

  const isDemo = demo && state.status === 'signed-out'

  const handleExit = () => {
    if (isDemo) {
      setDemo(false)
    } else {
      repos.reset()
      signOut()
    }
  }

  if (state.status === 'signed-in' && repos.state.status === 'unconfigured') {
    return (
      <>
        <RepoPicker onContinue={repos.save} onSignOut={handleExit} />
        <ToastViewport />
      </>
    )
  }

  const viewer: Viewer =
    state.status === 'signed-in' ? state.viewer : DEMO_VIEWER
  const trackedRepos = isDemo
    ? DEMO_TRACKED
    : repos.state.status === 'configured'
      ? repos.state.repos
      : []

  return (
    <>
      <Dashboard
        viewer={viewer}
        isDemo={isDemo}
        trackedRepos={trackedRepos}
        onSignOut={handleExit}
        onEditRepos={repos.reset}
      />
      <ToastViewport />
    </>
  )
}

export default App
