import Link from 'next/link'
import type {ReactNode} from 'react'
import {RELATION_COLOR, RELATION_LABEL} from '@/lib/format'
import type {ConceptRef, Relation} from '@/lib/sanity/types'

export function Chip({children}: {children: ReactNode}) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs text-ink-2">
      {children}
    </span>
  )
}

/** Verified links show their relation; everything else is only a citation fact (DESIGN_SPEC §4). */
export function RelationChip({relation, decision}: {relation: Relation | null; decision?: string}) {
  if (relation && decision === 'accepted') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{color: RELATION_COLOR[relation]}}>
        <span aria-hidden className="h-[3px] w-[18px] rounded" style={{background: RELATION_COLOR[relation]}} />
        {RELATION_LABEL[relation]}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <span aria-hidden className="w-[18px] border-t-2 border-dotted border-unreviewed" />
      Cites · not yet reviewed
    </span>
  )
}

export function QuoteBlock({text, source, compact}: {text?: string | null; source: string; compact?: boolean}) {
  if (!text) return null
  return (
    <figure className={`m-0 rounded-lg bg-surface ${compact ? 'px-3 py-2' : 'px-4 py-3'} border border-line`}>
      <blockquote className={`m-0 font-serif ${compact ? 'text-[15px]' : 'text-base'} leading-snug text-ink`}>“{text}”</blockquote>
      <figcaption className="mt-1.5 text-xs text-muted">{source}</figcaption>
    </figure>
  )
}

export function ConceptChip({concept, strong}: {concept: ConceptRef; strong?: boolean}) {
  return (
    <Link
      href={`/concept/${concept.slug}`}
      className={`inline-flex flex-col rounded-lg border bg-surface px-3 py-1.5 no-underline ${strong ? 'border-ink' : 'border-line'}`}
    >
      <span className={`text-[13px] text-ink ${strong ? 'font-semibold' : 'font-medium'}`}>{concept.name}</span>
      {concept.theme && <span className="text-[11px] text-muted">{concept.theme}</span>}
    </Link>
  )
}

export function StatTile({value, label, names}: {value: number | string; label: string; names?: string}) {
  return (
    <div className="rounded-lg bg-ground px-3 py-2.5">
      <div className="tabular text-xl font-semibold">{value}</div>
      <div className="text-xs text-ink-2">{label}</div>
      {names && <div className="mt-1 text-xs text-muted">{names}</div>}
    </div>
  )
}

export function Card({children, className = ''}: {children: ReactNode; className?: string}) {
  return <section className={`rounded-xl border border-line bg-surface ${className}`}>{children}</section>
}

export function EmptyState({children, action}: {children: ReactNode; action?: ReactNode}) {
  return (
    <p className="m-0 text-sm leading-relaxed text-ink-2">
      {children} {action}
    </p>
  )
}

export function AiCaption({kind = 'ai'}: {kind?: 'ai' | 'abstract'}) {
  return <div className="text-xs text-muted">{kind === 'ai' ? 'Drafted by AI · not yet reviewed' : 'From the abstract'}</div>
}

export function Breadcrumbs({items}: {items: {label: string; href?: string}[]}) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3.5 flex flex-wrap gap-2 text-[12.5px] text-muted">
      {items.map((item, i) => (
        <span key={item.label} className="flex gap-2">
          {i > 0 && <span aria-hidden>/</span>}
          {item.href ? (
            <Link href={item.href} className="text-muted">
              {item.label}
            </Link>
          ) : (
            <span aria-current="page">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
