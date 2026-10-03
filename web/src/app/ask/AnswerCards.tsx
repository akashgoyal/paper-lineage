'use client'

import Link from 'next/link'
import type {Card, CardPaper, LinkStatus} from '@/lib/ask/cards'
import {RELATION_COLOR, RELATION_LABEL} from '@/lib/format'

export type OpenItem = {kind: 'paper' | 'concept'; slug: string; label: string}

function PaperButton({paper, onOpen, focus}: {paper: CardPaper; onOpen: (i: OpenItem) => void; focus?: boolean}) {
  return (
    <button
      type="button"
      onClick={() => onOpen({kind: 'paper', slug: paper.slug, label: paper.shortName})}
      className={`flex w-[150px] shrink-0 flex-col gap-0.5 rounded-xl border px-3 py-2.5 text-left ${focus ? 'border-ink bg-ink text-white' : 'border-line-strong bg-surface text-ink'}`}
    >
      <span className={`tabular font-mono text-[11px] ${focus ? 'text-[#C9CCD3]' : 'text-muted'}`}>{paper.year}</span>
      <span className="text-sm font-semibold">{paper.shortName}</span>
    </button>
  )
}

function linkLabel(l: LinkStatus) {
  if (l.status === 'verified') return RELATION_LABEL[l.relation]
  if (l.status === 'cites') return `cites ${l.mentions}× · not yet reviewed`
  return 'no direct link in this dataset'
}

function Connector({link, vertical}: {link: LinkStatus; vertical?: boolean}) {
  const border = link.status === 'verified' ? `2px solid ${RELATION_COLOR[link.relation]}` : link.status === 'cites' ? '2px dotted var(--unreviewed)' : '2px dashed var(--line-strong)'
  return (
    <span className={vertical ? 'ml-5 flex items-center gap-2 py-1' : 'flex min-w-7 flex-1 items-center'}>
      <span aria-hidden className={vertical ? 'h-6 w-0' : 'h-0 w-full'} style={vertical ? {borderLeft: border} : {borderTop: border}} />
      <span className={vertical ? 'text-xs text-muted' : 'sr-only'}>then, via {linkLabel(link)}</span>
    </span>
  )
}

export function CardView({card, onOpen}: {card: Card; onOpen: (i: OpenItem) => void}) {
  switch (card.type) {
    case 'chain':
      return (
        <div className="rounded-xl border border-line bg-surface p-4">
          {/* desktop: horizontal; < 640: vertical list (DESIGN_SPEC §5.2) */}
          <div role="list" className="hidden items-center sm:flex">
            {card.steps.map((s, i) => (
              <div role="listitem" key={s.paper._id} className="contents">
                {i > 0 && <Connector link={card.links[i - 1]} />}
                <div className="flex flex-col gap-1">
                  <PaperButton paper={s.paper} onOpen={onOpen} focus={i === card.steps.length - 1} />
                  {s.concept && (
                    <button type="button" onClick={() => onOpen({kind: 'concept', slug: s.concept!.slug, label: s.concept!.name})} className="max-w-[150px] text-left text-xs text-ink-2 underline decoration-line-strong">
                      {s.concept.name}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <ol className="m-0 list-none p-0 sm:hidden">
            {card.steps.map((s, i) => (
              <li key={s.paper._id}>
                {i > 0 && <Connector vertical link={card.links[i - 1]} />}
                <button type="button" onClick={() => onOpen({kind: 'paper', slug: s.paper.slug, label: s.paper.shortName})} className="flex min-h-11 items-center gap-3 text-left">
                  <span className="w-9 font-mono text-[11.5px] text-muted">{s.paper.year}</span>
                  <span className="flex flex-col">
                    <span className="text-[15px] font-semibold">{s.paper.shortName}</span>
                    {s.concept && <span className="text-[12.5px] text-ink-2">{s.concept.name}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <div className="mt-3 hidden flex-wrap gap-x-4 gap-y-1 text-xs text-muted sm:flex">
            {card.links.map((l, i) => (
              <span key={i}>
                {card.steps[i].paper.shortName} → {card.steps[i + 1].paper.shortName}: {linkLabel(l)}
              </span>
            ))}
          </div>
        </div>
      )
    case 'papers':
      return (
        <div className="flex flex-col gap-2">
          {card.caption && <div className="overline">{card.caption}</div>}
          <div className="grid gap-2 sm:grid-cols-2">
            {card.papers.map((p) => (
              <button key={p._id} type="button" onClick={() => onOpen({kind: 'paper', slug: p.slug, label: p.shortName})} className="flex flex-col gap-0.5 rounded-xl border border-line bg-surface px-4 py-3 text-left">
                <span className="text-[15px] font-semibold">
                  {p.shortName} <span className="font-mono text-xs font-normal text-muted">{p.year}</span>
                </span>
                <span className="line-clamp-2 text-[13px] text-ink-2">{p.title}</span>
                <span className="tabular mt-1 text-xs text-muted">
                  built on {p.builtOn} · {p.builtOnIt} built on it
                </span>
              </button>
            ))}
          </div>
        </div>
      )
    case 'comparison':
      return (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <table className="hidden w-full border-collapse text-sm sm:table">
            <thead>
              <tr className="bg-ground text-left">
                <th scope="col" className="w-[22%] px-3.5 py-2.5 font-medium text-muted" />
                {[card.a, card.b].map((p) => (
                  <th key={p._id} scope="col" className="px-3.5 py-2.5 font-semibold">
                    <button type="button" onClick={() => onOpen({kind: 'paper', slug: p.slug, label: p.shortName})} className="font-semibold">
                      {p.shortName}
                    </button>{' '}
                    <span className="font-mono text-xs font-normal text-muted">{p.year}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {card.shared.length > 0 && (
                <tr className="border-t border-line">
                  <th scope="row" className="px-3.5 py-2.5 text-left font-medium text-ink-2">Shared</th>
                  <td colSpan={2} className="px-3.5 py-2.5">
                    <span className="flex flex-wrap gap-1.5">
                      {card.shared.map((c) => (
                        <button key={c.slug} type="button" onClick={() => onOpen({kind: 'concept', slug: c.slug, label: c.name})} className="rounded-full border border-line px-2.5 py-0.5 text-xs">
                          {c.name}
                        </button>
                      ))}
                    </span>
                  </td>
                </tr>
              )}
              {card.rows.map((r) => (
                <tr key={r.label} className="border-t border-line">
                  <th scope="row" className="px-3.5 py-2.5 text-left font-medium text-ink-2">{r.label}</th>
                  <td className="px-3.5 py-2.5">{r.a}</td>
                  <td className="px-3.5 py-2.5">{r.b}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-col divide-y divide-line sm:hidden">
            {card.rows.map((r) => (
              <div key={r.label} className="p-3 text-sm">
                <div className="overline mb-1">{r.label}</div>
                <p className="m-0"><b>{card.a.shortName}:</b> {r.a}</p>
                <p className="m-0 mt-1"><b>{card.b.shortName}:</b> {r.b}</p>
              </div>
            ))}
          </div>
        </div>
      )
    case 'quote':
      return (
        <figure className="m-0 rounded-xl border border-line bg-surface px-4 py-3">
          <blockquote className="m-0 font-serif text-base leading-snug">“{card.text}”</blockquote>
          <figcaption className="mt-1.5 text-xs text-muted">
            {/* Knowledge Base entries are summaries built from the papers, not the papers' own words. */}
            {card.via === 'knowledge-base' ? `Knowledge Base summary of ${card.paper}` : `From ${card.paper}’s text`}
            {card.section ? ` · ${card.section}` : ''}
            {card.mentions ? ` · cited ${card.mentions}×` : ''}
          </figcaption>
        </figure>
      )
    case 'storyline-draft':
      return (
        <p className="m-0 rounded-xl border border-line bg-surface px-4 py-3 text-sm">
          Storyline draft “{card.title}” sent to curators
          {card.unreviewedSteps ? ` (${card.unreviewedSteps} step${card.unreviewedSteps > 1 ? 's need' : ' needs'} review before it can be published)` : ''}.
        </p>
      )
    case 'followups':
      return null
  }
}

export function CardSkeleton() {
  return <div aria-hidden className="h-24 animate-pulse rounded-xl bg-line" />
}

export function FollowUps({items, onAsk, disabled}: {items: string[]; onAsk: (q: string) => void; disabled?: boolean}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((q) => (
        <button key={q} type="button" disabled={disabled} onClick={() => onAsk(q)} className="rounded-full border border-line-strong bg-surface px-3 py-1.5 text-[13px] disabled:opacity-50">
          {q}
        </button>
      ))}
    </div>
  )
}

export function SourcesLine({sources, focus}: {sources: {verified: number; unreviewed: number; papers: number}; focus?: {slug: string; name: string}}) {
  const links = sources.verified + sources.unreviewed
  return (
    <div className="flex flex-wrap items-center gap-2.5 text-[12.5px] text-muted">
      <span>
        {links
          ? `From ${links} link${links > 1 ? 's' : ''}: ${sources.verified} verified, ${sources.unreviewed} not yet reviewed`
          : `From ${sources.papers} paper${sources.papers === 1 ? '' : 's'} in this dataset`}
      </span>
      <Link href={focus ? `/explore?focus=${encodeURIComponent(focus.slug)}` : '/explore'} className="text-[12.5px]">
        {focus ? `Show ${focus.name} in Explorer` : 'Show in Explorer'}
      </Link>
    </div>
  )
}
