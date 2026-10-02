'use client'

import {createClient} from '@sanity/client'
import {useRouter} from 'next/navigation'
import {useEffect, useRef} from 'react'
import {apiVersion, dataset, projectId} from './client'
import {refreshSanity} from './actions'

// Subscribes to the Live Content API; when published content changes (e.g. a curator accepts a link in the
// Desk), expire the cached Sanity reads and re-render the current route. Debounced so a burst of edits
// causes one refresh.
export function SanityLive() {
  const router = useRouter()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const client = createClient({projectId, dataset, apiVersion, useCdn: true})
    const subscription = client.live.events().subscribe({
      next: (event) => {
        if (event.type !== 'message') return
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(async () => {
          await refreshSanity()
          router.refresh()
        }, 800)
      },
      error: () => {
        /* live updates are an enhancement; pages still work from cache */
      },
    })
    return () => {
      subscription.unsubscribe()
      if (timer.current) clearTimeout(timer.current)
    }
  }, [router])

  return null
}
