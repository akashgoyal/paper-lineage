'use client'

import {useEffect, useState} from 'react'
import {client} from './client'

/**
 * Fetch a GROQ query in the browser, keyed by `key`.
 * Returns undefined while the result for the current key is loading and null when it failed.
 * The result is stored with its key, so a key change shows loading without resetting state in the effect.
 */
export function useClientQuery<T>(query: string, params: Record<string, unknown>, key: string): T | null | undefined {
  const [state, setState] = useState<{key: string; data: T | null} | null>(null)
  useEffect(() => {
    let current = true
    client
      .fetch<T>(query, params)
      .then((data) => current && setState({key, data}))
      .catch(() => current && setState({key, data: null}))
    return () => {
      current = false
    }
    // params are derived from key by every caller
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, key])
  return state?.key === key ? state.data : undefined
}
