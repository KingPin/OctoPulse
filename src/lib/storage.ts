const PREFIX = 'octopulse:'

export type StorageKey =
  | 'theme'
  | 'githubToken'
  | 'trackedRepos'
  | 'llmConfig'
  | 'lastFetchAt'

export function get<T>(key: StorageKey): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch (e) {
    console.error(`octopulse: failed to parse ${key}`, e)
    return null
  }
}

export function set<T>(key: StorageKey, value: T): boolean {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
    return true
  } catch (e) {
    console.warn(`octopulse: failed to persist ${key}`, e)
    return false
  }
}

export function remove(key: StorageKey): void {
  localStorage.removeItem(PREFIX + key)
}

export function clear(): void {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i)
    if (key && key.startsWith(PREFIX)) localStorage.removeItem(key)
  }
}
