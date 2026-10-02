import {useEffect, useState} from 'react'
import {useClient} from 'sanity'
import {API_VERSION} from '../../schemaTypes/shared'

export const publishedId = (id: string) => id.replace(/^drafts\./, '')

// Fetch once per (query, params); views are read-only summaries, so no live listener is needed.
export function useViewData<T>(query: string, params: Record<string, unknown>): {data?: T; error?: Error} {
  const client = useClient({apiVersion: API_VERSION})
  const [state, setState] = useState<{data?: T; error?: Error}>({})
  const key = JSON.stringify(params)
  useEffect(() => {
    let alive = true
    client
      .fetch<T>(query, params, {perspective: 'drafts'})
      .then((data) => alive && setState({data}))
      .catch((error: Error) => alive && setState({error}))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, query, key])
  return state
}
