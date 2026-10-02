'use client'

import Link from 'next/link'
import {Chip, ConceptChip, StatTile} from '@/components/ui'
import {abstractLead, authorLine, monthYear, year} from '@/lib/format'
import {PANEL_CONCEPT_QUERY, PANEL_PAPER_QUERY} from '@/lib/sanity/queries'
import {useClientQuery} from '@/lib/sanity/useClientQuery'
import type {ConceptRef} from '@/lib/sanity/types'
import type {OpenItem} from './AnswerCards'

type PanelPaper = {
  title: string
  shortName: string
  slug: string
  publishedAt: string
  kind: string
  arxivId: string
  authors: string[]
  abstract: string
  summary?: string
  introduces: ConceptRef[]
  builtOn: {name: string}[]
  builtOnIt: {name: string}[]
}
type PanelConcept = {name: string; slug: string; summary: string; theme?: string; by?: {shortName: string; slug: string; publishedAt: string}; buildsOn?: {name: string; slug: string; by?: string}[]}

const names = (rows: {name: string}[]) => (rows.length ? `${rows.slice(0, 3).map((r) => r.name).join(', ')}${rows.length > 3 ? '…' : ''}` : undefined)

function PaperTab({slug, onAsk}: {slug: string; onAsk: (q: string) => void}) {
  const p = useClientQuery<PanelPaper | null>(PANEL_PAPER_QUERY, {slug}, slug)
  if (p === undefined) return <div aria-hidden className="h-80 animate-pulse rounded-lg bg-line" />
  if (!p) return <p className="text-sm text-ink-2">This paper could not be loaded.</p>
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap gap-2">
        <Chip>{p.kind[0].toUpperCase() + p.kind.slice(1)}</Chip>
        <Chip>{monthYear(p.publishedAt)}</Chip>
        <Chip>
          <span className="font-mono">arXiv {p.arxivId}</span>
        </Chip>
      </div>
      <h2 className="m-0 font-serif text-[26px] font-medium leading-tight">{p.title}</h2>
      <div className="text-[13px] text-ink-2">{authorLine(p.authors)}</div>
      <p className="m-0 font-serif text-[15.5px] leading-normal">{p.summary || abstractLead(p.abstract)}</p>
      <div className="text-xs text-muted">{p.summary ? 'Drafted by AI · not yet reviewed' : 'From the abstract'}</div>
      {p.introduces.length > 0 && (
        <>
          <div className="overline">Introduces</div>
          <div className="flex flex-wrap gap-2">
            {p.introduces.map((c) => (
              <ConceptChip key={c.slug} concept={c} strong />
            ))}
          </div>
        </>
      )}
      <div className="grid grid-cols-2 gap-2.5">
        <StatTile value={p.builtOn.length} label="papers it built on" names={names(p.builtOn)} />
        <StatTile value={p.builtOnIt.length} label="papers built on it" names={names(p.builtOnIt)} />
      </div>
      <div className="flex gap-2">
        <Link href={`/paper/${p.slug}`} className="flex-1 rounded-lg bg-ink px-3 py-2.5 text-center text-[13px] font-medium text-white no-underline">
          Open full page
        </Link>
        <Link href={`/explore?focus=${p.slug}`} className="flex-1 rounded-lg border border-line-strong px-3 py-2.5 text-center text-[13px] text-ink no-underline">
          Explore its lineage
        </Link>
      </div>
      <button type="button" onClick={() => onAsk(`What did ${p.shortName} build on?`)} className="self-start text-[13px] text-[var(--rel-extends)] underline">
        Ask about {p.shortName} →
      </button>
    </div>
  )
}

function ConceptTab({slug, onAsk}: {slug: string; onAsk: (q: string) => void}) {
  const c = useClientQuery<PanelConcept | null>(PANEL_CONCEPT_QUERY, {slug}, slug)
  if (c === undefined) return <div aria-hidden className="h-60 animate-pulse rounded-lg bg-line" />
  if (!c) return <p className="text-sm text-ink-2">This concept could not be loaded.</p>
  return (
    <div className="flex flex-col gap-3">
      {c.theme && <div className="overline">{c.theme}</div>}
      <h2 className="m-0 font-serif text-[26px] font-medium leading-tight">{c.name}</h2>
      <p className="m-0 font-serif text-[15.5px]">{c.summary}</p>
      {c.by && (
        <p className="m-0 text-sm text-ink-2">
          Introduced by <Link href={`/paper/${c.by.slug}`}>{c.by.shortName}</Link> ({year(c.by.publishedAt)})
        </p>
      )}
      {c.buildsOn && c.buildsOn.length > 0 && (
        <p className="m-0 text-sm text-ink-2">
          Builds on: {c.buildsOn.map((b, i) => (
            <span key={b.slug}>
              {i > 0 && ', '}
              <Link href={`/concept/${b.slug}`}>{b.name}</Link>
            </span>
          ))}
        </p>
      )}
      <Link href={`/concept/${c.slug}`} className="self-start rounded-lg bg-ink px-3 py-2.5 text-[13px] font-medium text-white no-underline">
        Open concept page
      </Link>
      <button type="button" onClick={() => onAsk(`Where did ${c.name} come from?`)} className="self-start text-[13px] text-[var(--rel-extends)] underline">
        Ask about {c.name} →
      </button>
    </div>
  )
}

// Papers and concepts opened from answers (DESIGN_SPEC §6.2): tabs on ≥ 1024 px, a bottom sheet below.
export function OpenedPanel(props: {items: OpenItem[]; active: number; onSelect: (i: number) => void; onClose: () => void; onAsk: (q: string) => void}) {
  const {items, active} = props
  if (!items.length) return null
  const item = items[Math.min(active, items.length - 1)]
  return (
    <aside
      aria-label="Opened papers"
      className="fixed inset-x-0 bottom-0 z-20 max-h-[90vh] overflow-auto rounded-t-2xl border border-line bg-surface shadow-[0_-6px_24px_rgb(23_25_30/.12)] lg:sticky lg:top-20 lg:z-0 lg:max-h-[calc(100vh-100px)] lg:rounded-2xl lg:shadow-none"
    >
      <div className="flex items-end gap-0.5 border-b border-line bg-ground px-2 pt-2">
        <div role="tablist" aria-label="Opened from chat" className="flex min-w-0 flex-1 gap-0.5 overflow-x-auto">
          {items.map((it, i) => (
            <button
              key={`${it.kind}:${it.slug}`}
              type="button"
              role="tab"
              aria-selected={i === active}
              onClick={() => props.onSelect(i)}
              className={`-mb-px h-9 shrink-0 rounded-t-lg border border-b-0 px-3.5 text-[13px] ${i === active ? 'border-line bg-surface font-semibold text-ink' : 'border-transparent text-ink-2'}`}
            >
              {it.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={props.onClose} aria-label="Close panel" className="mb-1 size-9 shrink-0 rounded-lg text-ink-2 hover:bg-surface">
          ✕
        </button>
      </div>
      <div className="p-5" role="tabpanel">
        {item.kind === 'paper' ? <PaperTab slug={item.slug} onAsk={props.onAsk} /> : <ConceptTab slug={item.slug} onAsk={props.onAsk} />}
      </div>
    </aside>
  )
}
