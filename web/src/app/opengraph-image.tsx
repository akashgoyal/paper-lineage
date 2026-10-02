import {ImageResponse} from 'next/og'
import {OG_SIZE, OgFrame} from '@/lib/og/frame'
import {sanityFetch} from '@/lib/sanity/client'
import {STATS_QUERY} from '@/lib/sanity/queries'
import type {Stats} from '@/lib/sanity/types'

export const alt = 'Paper Lineage: every idea has ancestors'
export const size = OG_SIZE
export const contentType = 'image/png'

export default async function Image() {
  const stats = await sanityFetch<Stats>(STATS_QUERY)
  return new ImageResponse(
    (
      <OgFrame eyebrow="ASK" title="Every idea has ancestors." footer={`${stats.papers} papers · ${stats.links.toLocaleString('en-US')} citation links · ${stats.concepts} concepts`}>
        <div style={{display: 'flex', marginTop: 24, fontSize: 34, color: '#3A3F48'}}>Ask where an AI idea came from, with the citing sentence as evidence.</div>
      </OgFrame>
    ),
    size,
  )
}
