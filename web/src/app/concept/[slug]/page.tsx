import type {Metadata} from 'next'
import Link from 'next/link'
import {notFound} from 'next/navigation'
import {AiCaption, Breadcrumbs, Card, Chip, EmptyState, QuoteBlock, RelationChip} from '@/components/ui'
import {chainPaperIds, mainChain, type ChainStep} from '@/lib/evolution'
import {RELATION_COLOR, year} from '@/lib/format'
import {sanityFetch} from '@/lib/sanity/client'
import {CONCEPT_QUERY, CONCEPT_SLUGS_QUERY, LINKS_BETWEEN_QUERY} from '@/lib/sanity/queries'
import type {Concept, LinkFields} from '@/lib/sanity/types'

type BetweenLink = LinkFields & {from: string; to: string}

export async function generateStaticParams() {
  const slugs = await sanityFetch<string[]>(CONCEPT_SLUGS_QUERY)
  return slugs.filter((s) => !s.startsWith('theme-')).map((slug) => ({slug}))
}

export async function generateMetadata({params}: PageProps<'/concept/[slug]'>): Promise<Metadata> {
  const {slug} = await params
  const concept = await sanityFetch<Concept | null>(CONCEPT_QUERY, {slug})
  if (!concept) return {}
  return {
    title: concept.name,
    description: concept.by
      ? `Where ${concept.name} came from, introduced by ${concept.by.shortName} (${year(concept.by.publishedAt)}).`
      : concept.summary,
  }
}

function Connector({link}: {link?: BetweenLink}) {
  const verified = link?.decision === 'accepted' && link.relation
  const style = !link
    ? {borderLeft: '2px dashed var(--line-strong)'}
    : verified
      ? {borderLeft: `2px solid ${RELATION_COLOR[link.relation!]}`}
      : {borderLeft: '2px dotted var(--unreviewed)'}
  return <span aria-hidden className="mt-1 w-0 flex-1" style={style} />
}

function Step({step, next, links}: {step: ChainStep; next?: ChainStep; links: BetweenLink[]}) {
  const {node} = step
  const link = next && node.by && next.node.by ? links.find((l) => l.from === node.by!._id && l.to === next.node.by!._id) : undefined
  const isLast = !next
  return (
    <li className="grid grid-cols-[52px_28px_minmax(0,1fr)] gap-x-3.5">
      <div className="tabular pt-1 text-right font-mono text-[13px] text-muted">{year(node.by?.publishedAt)}</div>
      <div className="flex flex-col items-center">
        <span aria-hidden className={`mt-1.5 size-3.5 rounded-full border-2 border-ink ${isLast ? 'bg-ink' : 'bg-surface'}`} />
        {!isLast && <Connector link={link} />}
      </div>
      <div className={isLast ? '' : 'pb-7'}>
        <div className="flex flex-wrap items-baseline gap-x-2.5">
          {node.by ? (
            <Link href={`/paper/${node.by.slug}`} className="font-serif text-[22px] font-medium text-ink no-underline">
              {node.by.shortName}
            </Link>
          ) : (
            <span className="font-serif text-[22px] font-medium">No introducing paper recorded</span>
          )}
          <Link href={`/concept/${node.slug}`} className="text-sm text-ink-2">
            {node.name}
          </Link>
        </div>
        <p className="m-0 mt-0.5 text-sm text-ink-2">{node.summary}</p>
        {step.alsoDrawsOn.length > 0 && (
          <p className="m-0 mt-1 text-[13px] text-muted">
            Also draws on:{' '}
            {step.alsoDrawsOn.map((c, i) => (
              <span key={c._id}>
                {i > 0 && ', '}
                <Link href={`/concept/${c.slug}`}>{c.name}</Link>
                {c.by ? ` (${c.by.shortName})` : ''}
              </span>
            ))}
          </p>
        )}
        {!isLast && (
          <div className="mt-3 flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              {link ? <RelationChip relation={link.relation} decision={link.decision} /> : <span className="text-xs text-muted">No direct link between these papers in this dataset</span>}
              {link && <span className="tabular font-mono text-[11.5px] text-muted">cited {link.mentions}×{link.evidence?.section ? ` · §${link.evidence.section}` : ''}</span>}
            </div>
            {link?.evidence?.text && <QuoteBlock compact text={link.evidence.text} source={`From ${next!.node.by?.shortName} · §${link.evidence.section || 'unknown'}`} />}
          </div>
        )}
      </div>
    </li>
  )
}

export default async function ConceptPage({params}: PageProps<'/concept/[slug]'>) {
  const {slug} = await params
  const concept = await sanityFetch<Concept | null>(CONCEPT_QUERY, {slug})
  if (!concept || concept.level === 'theme') notFound()

  const steps = mainChain(concept)
  const ids = chainPaperIds(steps)
  const links = ids.length > 1 ? await sanityFetch<BetweenLink[]>(LINKS_BETWEEN_QUERY, {ids}) : []

  return (
    <main className="mx-auto max-w-[1440px] px-4 pb-14 pt-8 md:px-8">
      <Breadcrumbs
        items={[
          {label: 'Concepts', href: '/concepts'},
          ...(concept.theme ? [{label: concept.theme.name, href: `/theme/${concept.theme.slug}`}] : []),
          {label: concept.name},
        ]}
      />
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-7">
          <header className="flex flex-col gap-2.5">
            <div className="flex flex-wrap gap-2">
              <Chip>{concept.category.replace('-', ' ')}</Chip>
              {concept.by && (
                <Chip>
                  Introduced by <b className="text-ink">{concept.by.shortName}</b> · {year(concept.by.publishedAt)}
                </Chip>
              )}
            </div>
            <h1 className="m-0 font-serif text-3xl font-medium tracking-tight md:text-[46px] md:leading-tight">{concept.name}</h1>
            <p className="m-0 max-w-[720px] font-serif text-xl leading-normal">{concept.summary}</p>
            <AiCaption />
          </header>

          <section aria-labelledby="evolved">
            <h2 id="evolved" className="m-0 mb-1 font-serif text-[28px] font-medium">
              How this idea evolved
            </h2>
            {steps.length > 1 ? (
              <>
                <p className="m-0 mb-5 text-sm text-ink-2">
                  Each step is the idea’s introducing paper. The line between steps is the citation link between those papers.
                </p>
                <ol className="m-0 list-none p-0">
                  {steps.map((step, i) => (
                    <Step key={step.node._id} step={step} next={steps[i + 1]} links={links} />
                  ))}
                </ol>
              </>
            ) : (
              <EmptyState>No earlier ideas recorded for this concept yet.</EmptyState>
            )}
          </section>

          <Card className="px-6 py-5">
            <h2 className="m-0 mb-2 font-serif text-[22px] font-medium">Papers using this</h2>
            {concept.usedBy.length ? (
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {concept.usedBy.map((p) => (
                  <li key={p._id} className="flex gap-3">
                    <span className="tabular w-10 font-mono text-[13px] text-muted">{year(p.publishedAt)}</span>
                    <Link href={`/paper/${p.slug}`}>{p.shortName}</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState>No other paper in this dataset is tagged with it yet.</EmptyState>
            )}
          </Card>
        </div>

        <aside className="flex flex-col gap-5">
          {concept.theme && (
            <Card className="flex flex-col p-4">
              <div className="overline">Theme</div>
              <Link href={`/theme/${concept.theme.slug}`} className="mb-2 font-serif text-xl text-ink no-underline">
                {concept.theme.name}
              </Link>
              {concept.siblings.map((s) => (
                <Link key={s.slug} href={`/concept/${s.slug}`} className="flex justify-between gap-2.5 border-t border-line py-2 text-sm text-ink no-underline">
                  <span>{s.name}</span>
                  {s.by && <span className="font-mono text-xs text-muted">{s.by}</span>}
                </Link>
              ))}
            </Card>
          )}
          <Card className="flex flex-col gap-2.5 p-4">
            <div className="overline">Next questions</div>
            {[
              `Where did ${concept.name} come from?`,
              concept.by ? `What did ${concept.by.shortName} build on?` : null,
              `Which papers use ${concept.name}?`,
            ]
              .filter((q): q is string => !!q)
              .map((q) => (
                <Link key={q} href={`/?q=${encodeURIComponent(q)}`} className="text-sm">
                  {q} →
                </Link>
              ))}
          </Card>
        </aside>
      </div>
    </main>
  )
}
