'use client'

import {useSyncExternalStore} from 'react'

// The paper the visitor last asked about, so Explore opens on it. Browser-only (localStorage);
// the server render and hydration see null, so links fall back to the default focus.
export type Focus = {slug: string; name: string}

const KEY = 'pl:focus'
let cache: Focus | null | undefined
const listeners = new Set<() => void>()

function read(): Focus | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Focus | null
    return v && typeof v.slug === 'string' ? v : null
  } catch {
    return null
  }
}

export const focusStore = {
  get: () => (cache === undefined ? (cache = read()) : cache),
  set(f: Focus) {
    cache = f
    try {
      localStorage.setItem(KEY, JSON.stringify(f))
    } catch {
      /* private mode: keeps working for this page view */
    }
    listeners.forEach((l) => l())
  },
  subscribe(l: () => void) {
    listeners.add(l)
    return () => listeners.delete(l)
  },
}

export const useFocus = () => useSyncExternalStore(focusStore.subscribe, focusStore.get, () => null)
export const exploreHref = (f: Focus | null) => (f ? `/explore?focus=${encodeURIComponent(f.slug)}` : '/explore')
