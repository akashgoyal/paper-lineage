import type {Metadata} from 'next'
import {Suspense} from 'react'
import {PageSkeleton} from '@/components/Skeleton'
import {sanityFetch} from '@/lib/sanity/client'
import {GRAPH_QUERY} from '@/lib/sanity/queries'
import type {GraphLink, GraphPaper} from '@/lib/sanity/types'
import {Explorer} from './Explorer'

export const metadata: Metadata = {
  title: 'Explore',
  description: 'See any paper’s ancestry laid out by year: solid lines are verified lineage, dotted lines are citations not yet reviewed.',
}

export default async function ExplorePage() {
  const graph = await sanityFetch<{papers: GraphPaper[]; links: GraphLink[]}>(GRAPH_QUERY)
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Explorer papers={graph.papers} links={graph.links} />
    </Suspense>
  )
}
