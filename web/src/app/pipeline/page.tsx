import type {Metadata} from 'next'
import Link from 'next/link'
import {Card, EmptyState, RelationChip} from '@/components/ui'
import {sanityFetch} from '@/lib/sanity/client'
import {PIPELINE_QUERY, STATS_QUERY} from '@/lib/sanity/queries'
import type {LinkFields, Stats} from '@/lib/sanity/types'

export const metadata: Metadata = {title: 'Pipeline', description: 'How links get verified, and what curators have verified most recently.'}

type Pipeline = {
  recent: (LinkFields & {from: {shortName: string; slug: string}; to: {shortName: string; slug: string}; reviewedAt?: string})[]
  gaps: number
}

const STAGES = ['Fetching', 'Enriching', 'Checks', 'Curation', 'Publishing', 'Published']

export default async function PipelinePage() {
  const [stats, pipeline] = await Promise.all([sanityFetch<Stats>(STATS_QUERY), sanityFetch<Pipeline>(PIPELINE_QUERY)])
  const pct = stats.links ? (stats.accepted / stats.links) * 100 : 0
  return (
    <main className="mx-auto max-w-[1100px] px-4 pb-14 pt-10 md:px-8">
      <h1 className="m-0 font-serif text-4xl font-medium">Pipeline</h1>
      <p className="mt-2 max-w-[720px] text-ink-2">
        Every link starts as a <b>citation fact</b> mined from a paper’s full text: how many times it cites an earlier paper, where, and the
        sentence. A curator reads the evidence and either accepts it with a relation (extends, reuses components, challenges…) or rejects it.
        Only accepted links show a relation anywhere on this site.
      </p>

      <Card className="mt-6 p-6">
        <div className="overline">Verified so far</div>
        <div className="tabular mt-1 font-serif text-4xl">
          {stats.accepted.toLocaleString('en-US')} <span className="text-2xl text-muted">of {stats.links.toLocaleString('en-US')} links</span>
        </div>
        <div className="mt-3 h-2 rounded bg-line" role="img" aria-label={`${pct.toFixed(1)}% verified`}>
          <div className="h-2 rounded bg-[var(--rel-extends)]" style={{width: `${pct}%`}} />
        </div>
        {stats.accepted === 0 && <p className="mb-0 mt-3 text-sm text-ink-2">Curation is starting: no link has been verified yet.</p>}
        {pipeline.gaps > 0 && <p className="mb-0 mt-2 text-sm text-ink-2">{pipeline.gaps} open curation tasks from visitors’ questions and suggestions.</p>}
      </Card>

      <h2 className="mb-2 mt-10 font-serif text-2xl font-medium">Recently verified</h2>
      {pipeline.recent.length ? (
        <ul className="m-0 list-none rounded-xl border border-line bg-surface p-0">
          {pipeline.recent.map((l) => (
            <li key={l._id} className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-3 first:border-t-0">
              <span className="font-medium">
                <Link href={`/paper/${l.from.slug}`}>{l.from.shortName}</Link> → <Link href={`/paper/${l.to.slug}`}>{l.to.shortName}</Link>
              </span>
              <RelationChip relation={l.relation} decision={l.decision} />
              {l.reviewedAt && <span className="ml-auto font-mono text-xs text-muted">{new Date(l.reviewedAt).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</span>}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState>Nothing verified yet. Accepted links appear here the moment a curator publishes them.</EmptyState>
      )}

      <h2 className="mb-2 mt-10 font-serif text-2xl font-medium">Intake board</h2>
      <p className="m-0 mb-3 text-sm text-ink-2">New papers move through these stages: AI drafts the links, checks verify the quotes, and a curator always decides.</p>
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {STAGES.map((s) => (
          <div key={s} className="min-h-24 rounded-xl border border-line bg-surface p-3">
            <div className="overline">{s}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-ink-2">No papers in the intake pipeline right now.</p>
    </main>
  )
}
