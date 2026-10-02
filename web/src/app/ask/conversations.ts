import type {Turn} from './stream'

export type Conversation = {id: string; title: string; turns: Turn[]; updatedAt: number}

const STORE = 'pl:conversations'
const MAX_CONVERSATIONS = 10
const EMPTY: Conversation[] = []

// localStorage-backed list read through useSyncExternalStore, so the server render and hydration see [].
let cache: Conversation[] | null = null
const listeners = new Set<() => void>()

function load(): Conversation[] {
  try {
    return JSON.parse(localStorage.getItem(STORE) ?? '[]') as Conversation[]
  } catch {
    return EMPTY
  }
}

export const conversations = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  get: () => (cache ??= load()),
  server: () => EMPTY,
  upsert(conv: Conversation) {
    cache = [conv, ...conversations.get().filter((c) => c.id !== conv.id)].slice(0, MAX_CONVERSATIONS)
    try {
      localStorage.setItem(STORE, JSON.stringify(cache))
    } catch {
      /* private mode or full storage: conversations just won't persist */
    }
    listeners.forEach((l) => l())
  },
}
