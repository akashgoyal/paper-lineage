import {Suspense} from 'react'
import {sanityFetch} from '@/lib/sanity/client'
import {SITE_QUERY, STATS_QUERY} from '@/lib/sanity/queries'
import type {SiteSettings, Stats} from '@/lib/sanity/types'
import {AskApp} from './ask/AskApp'

export default async function Home() {
  const [settings, stats] = await Promise.all([sanityFetch<SiteSettings | null>(SITE_QUERY), sanityFetch<Stats>(STATS_QUERY)])
  return (
    <Suspense>
      <AskApp settings={settings} stats={stats} />
    </Suspense>
  )
}
