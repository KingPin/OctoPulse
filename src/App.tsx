import { Activity } from 'lucide-react'

function App() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Activity className="w-8 h-8 text-[var(--color-accent)]" />
          <h1 className="text-3xl font-semibold tracking-tight">OctoPulse</h1>
        </div>
        <p className="text-[var(--color-fg-muted)]">
          Maintainer command center — scaffold ready.
        </p>
      </div>
    </main>
  )
}

export default App
