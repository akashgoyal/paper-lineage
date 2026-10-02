import type {Metadata} from 'next'
import Link from 'next/link'
import {notFound} from 'next/navigation'
import {MiniGraph} from '@/components/MiniGraph'
import {AiCaption, Breadcrumbs, Card, Chip, ConceptChip, EmptyState, RelationChip} from '@/components/ui'
import {abstractLead, authorLine, monthYear, plural, year} from '@/lib/format'
import {sanityFetch} from '@/lib/sanity/client'
import {PAPER_QUERY, PAPER_SLUGS_QUERY} from '@/lib/sanity/queries'
import type {LinkFields, Paper, PaperCard} from '@/lib/sanity/types'

export async function generateStaticParams() {
  const slugs = await sanityFetch<string[]>(PAPER_SLUGS_QUERY)
  return slugs.map((slug) => ({slug}))
}

export async function generateMetadata({params}: PageProps<'/paper/[slug]'>): Promise<Metadata> {
  const {slug} = await params
  const paper = await sanityFetch<Paper | null>(PAPER_QUERY, {slug})
  if (!paper) return {}
  return {
    title: `${paper.shortName} (${year(paper.publishedAt)})`,
    description: `What ${paper.shortName} (${year(paper.publishedAt)}) built on and led to, with quotes from the papers.`,
  }
}

type Row = LinkFields & {paper: PaperCard}

function BuiltOnRow({row, verified, direction}: {row: Row; verified: boolean; direction: 'in' | 'out'}) {
  const quoteSource = direction === 'in' ? 'this paper' : row.paper.shortName
  return (
    <li className="grid gap-x-5 gap-y-2 border-t border-line py-4 md:grid-cols-[170px_minmax(0,1fr)]">
      <div className="flex flex-col gap-1.5">
        <Link href={`/paper/${row.paper.slug}`} className="text-[15px] font-semibold text-ink no-underline">
          {row.paper.shortName}
        </Link>
        <span className="tabular font-mono text-[11.5px] text-muted">
          {year(row.paper.publishedAt)} · cited {row.mentions}×{row.methodMentions ? `, ${row.methodMentions} in Method` : ''}
        </span>
        {verified && <RelationChip relation={row.relation} decision={row.decision} />}
      </div>
      <div className="font-serif text-[15.5px] leading-snug text-ink">
        {row.evidence?.text ? (
          <>
            “{row.evidence.text.length > 220 ? `${row.evidence.text.slice(0, 220).trimEnd()}…` : row.evidence.text}”
            <div className="mt-1 font-sans text-xs text-muted">
              From {quoteSource} · §{row.evidence.section || 'unknown section'}
            </div>
          </>
        ) : (
          <span className="font-sans text-sm text-muted">Cited {row.mentions}×; no citation sentence captured.</span>
        )}
        {verified && row.explanation && <p className="mt-2 font-sans text-sm text-ink-2">{row.explanation}</p>}
      </div>
    </li>
  )
}

export default async function PaperPage({params}: PageProps<'/paper/[slug]'>) {
  const {slug} = await params
  const paper = await sanityFetch<Paper | null>(PAPER_QUERY, {slug})
  if (!paper) notFound()

  const verified = paper.builtOn.filter((r) => r.decision === 'accepted' && r.relation)
  const pending = paper.builtOn.filter((r) => !(r.decision === 'accepted' && r.relation) && r.decision !== 'rejected')
  const ledTo = paper.ledTo.filter((r) => r.decision !== 'rejected')
  const kindLabel = paper.kind[0].toUpperCase() + paper.kind.slice(1)

  return (
    <main className="mx-auto max-w-[1440px] px-4 pb-14 pt-8 md:px-8">
      <Breadcrumbs items={[{label: 'Explore', href: `/explore?focus=${paper.slug}`}, {label: paper.shortName}]} />
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-7">
          <header className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <Chip>{kindLabel}</Chip>
              <Chip>{monthYear(paper.publishedAt)}</Chip>
              <Chip>
                <a href={`https://arxiv.org/abs/${paper.arxivId}`} className="font-mono text-ink-2 no-underline" rel="noreferrer" target="_blank">
                  arXiv {paper.arxivId}
                </a>
              </Chip>
              {paper.primaryCategory && <Chip>{paper.primaryCategory}</Chip>}
            </div>
            <h1 className="m-0 font-serif text-3xl font-medium leading-tight tracking-tight md:text-[42px]">{paper.title}</h1>
            <div className="text-sm text-ink-2">{authorLine(paper.authors)}</div>
            <p className="m-0 mt-1 max-w-[760px] font-serif text-xl leading-normal text-ink">
              {paper.summary || abstractLead(paper.abstract)}
            </p>
            <AiCaption kind={paper.summary ? 'ai' : 'abstract'} />
          </header>

          <Card className="px-6 pb-2 pt-5">
            <div className="flex flex-wrap items-baseline gap-3">
              <h2 id="built-on" className="m-0 font-serif text-[26px] font-medium">
                Built on
              </h2>
              <span className="text-[13px] text-ink-2">
                {plural(paper.builtOn.length, 'paper')} · {verified.length} verified
              </span>
              <span className="flex-1" />
              <Link href={`/explore?focus=${paper.slug}`} className="text-[13px]">
                See as graph
              </Link>
            </div>
            {!paper.builtOn.length && (
              <div className="py-4">
                <EmptyState>{paper.shortName} has no earlier papers in this dataset.</EmptyState>
              </div>
            )}
            {verified.length > 0 && (
              <>
                <h3 className="overline mt-4">Verified lineage</h3>
                <ul className="m-0 mt-1 list-none p-0">
                  {verified.map((row) => (
                    <BuiltOnRow key={row._id} row={row} verified direction="in" />
                  ))}
                </ul>
              </>
            )}
            {pending.length > 0 && (
              <>
                <h3 className="overline mt-5">Also cited · not yet reviewed ({pending.length})</h3>
                <ul className="m-0 mt-1 list-none p-0">
                  {pending.slice(0, 4).map((row) => (
                    <BuiltOnRow key={row._id} row={row} verified={false} direction="in" />
                  ))}
                </ul>
                {pending.length > 4 && (
                  // Native disclosure keeps the page fully static (no query param, no client JS).
                  <details className="group">
                    <summary className="my-3 inline-block cursor-pointer list-none rounded-lg border border-line-strong px-3.5 py-2 text-[13px] text-ink group-open:hidden">
                      Show {pending.length - 4} more
                    </summary>
                    <ul className="m-0 list-none p-0">
                      {pending.slice(4).map((row) => (
                        <BuiltOnRow key={row._id} row={row} verified={false} direction="in" />
                      ))}
                    </ul>
                  </details>
                )}
              </>
            )}
            <div className="h-3" />
          </Card>

          <Card className="px-6 py-5">
            <h2 className="m-0 mb-2 font-serif text-[26px] font-medium">Led to</h2>
            {ledTo.length ? (
              <ul className="m-0 list-none p-0">
                {ledTo.map((row) => (
                  <BuiltOnRow key={row._id} row={row} verified={row.decision === 'accepted' && !!row.relation} direction="out" />
                ))}
              </ul>
            ) : (
              <EmptyState action={<Link href="/suggest">Suggest a paper that builds on {paper.shortName} →</Link>}>
                Nothing yet. {paper.harvest?.depth === 0 ? 'This dataset starts here and was traced backwards.' : 'No later paper in this dataset cites it strongly.'}
              </EmptyState>
            )}
          </Card>

          <details className="rounded-xl border border-line bg-surface px-6 py-4">
            <summary className="cursor-pointer font-serif text-xl">Abstract</summary>
            <p className="mb-0 mt-3 max-w-[760px] font-serif text-base leading-relaxed text-ink">{paper.abstract}</p>
          </details>
        </div>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-20">
          {paper.builtOn.length > 0 && (
            <Card className="hidden p-4 sm:block">
              <div className="overline mb-2.5">Neighbourhood</div>
              <MiniGraph focus={paper} rows={[...verified, ...pending]} />
              <Link href={`/explore?focus=${paper.slug}`} className="text-[13px]">
                Open in Explorer →
              </Link>
            </Card>
          )}
          <Card className="flex flex-col gap-3 p-4">
            <div className="overline">Introduces</div>
            {paper.introduces.length ? (
              <div className="flex flex-wrap gap-2">
                {paper.introduces.map((c) => (
                  <ConceptChip key={c.slug} concept={c} strong />
                ))}
              </div>
            ) : (
              <EmptyState>No concept in this dataset is credited to {paper.shortName}.</EmptyState>
            )}
            {paper.uses && paper.uses.length > 0 && (
              <>
                <div className="overline mt-1.5">Uses</div>
                <div className="flex flex-wrap gap-2">
                  {paper.uses.slice(0, 12).map((c) => (
                    <ConceptChip key={c.slug} concept={c} />
                  ))}
                </div>
              </>
            )}
            <div className="text-xs text-muted">Concept tags drafted by AI · not yet reviewed</div>
          </Card>
          <section aria-label="Source" className="rounded-xl border border-dashed border-line-strong px-4 py-3.5 text-[12.5px] leading-relaxed text-ink-2">
            <b className="text-ink">Where this comes from.</b> Read from the paper’s full text (
            {paper.harvest?.fullTextSource === 'pdf' ? 'PDF' : 'ar5iv / arXiv HTML'}): {plural(paper.harvest?.referenceCount ?? 0, 'citation')} to other
            papers in this dataset, each with its sentence kept as evidence. <Link href="/about#verification">How links are verified</Link>
          </section>
        </aside>
      </div>
    </main>
  )
}
