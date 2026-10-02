'use client'

import Link from 'next/link'
import {useEffect, useRef, useState} from 'react'
import {QuoteBlock, RelationChip} from '@/components/ui'
import {year} from '@/lib/format'
import type {LinkFields, PaperCard} from '@/lib/sanity/types'
import {RichText, type Block} from './RichText'

export type StoryStep = {_key: string; narrative?: Block[]; link: (LinkFields & {from: PaperCard; to: PaperCard}) | null}

/** Narrative on the left; a sticky chain on the right highlights the step being read (DESIGN_SPEC §7). */
export function StoryBody({steps}: {steps: StoryStep[]}) {
  const [active, setActive] = useState(0)
  const refs = useRef<(HTMLElement | null)[]>([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visible) setActive(Number((visible.target as HTMLElement).dataset.index))
      },
      {rootMargin: '-35% 0px -55% 0px'},
    )
    refs.current.forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [steps])

  // Papers in reading order; a curator may jump between branches, so dedupe instead of assuming one chain.
  const papers = [...new Map(steps.flatMap((s) => (s.link ? [s.link.from, s.link.to] : [])).map((p) => [p._id, p])).values()]
  const current = steps[active]?.link
  const lit = new Set(current ? [current.from._id, current.to._id] : [])

  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,680px)_1fr]">
      <ol className="m-0 list-none p-0">
        {steps.map((step, i) => (
          <li
            key={step._key}
            data-index={i}
            ref={(el) => {
              refs.current[i] = el
            }}
            className={`border-l-2 pb-8 pl-5 transition-colors ${i === active ? 'border-ink' : 'border-line'}`}
          >
            {step.link ? (
              <>
                <p className="m-0 font-mono text-xs text-muted">Step {i + 1}</p>
                <h2 className="m-0 mt-1 font-serif text-2xl font-medium">
                  <Link href={`/paper/${step.link.from.slug}`} className="text-ink no-underline">{step.link.from.shortName}</Link>
                  <span className="text-muted"> → </span>
                  <Link href={`/paper/${step.link.to.slug}`} className="text-ink no-underline">{step.link.to.shortName}</Link>
                </h2>
                <div className="mt-2">
                  <RelationChip relation={step.link.relation} decision={step.link.decision} />
                </div>
              </>
            ) : (
              <p className="m-0 text-sm text-muted">This step’s link was removed.</p>
            )}
            {step.narrative && <RichText value={step.narrative} />}
            {step.link?.evidence?.text && (
              <QuoteBlock text={step.link.evidence.text} source={`${step.link.to.shortName}, ${step.link.evidence.section ?? 'citation'}`} compact />
            )}
          </li>
        ))}
      </ol>
      <aside className="hidden lg:block">
        <div className="sticky top-24 rounded-xl border border-line bg-surface p-5">
          <p className="m-0 font-mono text-xs uppercase tracking-wide text-muted">The chain</p>
          <ol className="m-0 mt-3 list-none p-0">
            {papers.map((p, i) => {
              return (
                <li key={p._id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className={`mt-1.5 h-2.5 w-2.5 rounded-full ${lit.has(p._id) ? 'bg-ink' : 'bg-line-strong'}`} />
                    {i < papers.length - 1 && <span className={`w-0.5 flex-1 ${lit.has(p._id) && lit.has(papers[i + 1]._id) ? 'bg-ink' : 'bg-line'}`} />}
                  </div>
                  <Link href={`/paper/${p.slug}`} className={`pb-4 no-underline ${lit.has(p._id) ? 'text-ink' : 'text-muted'}`}>
                    <span className="block font-medium">{p.shortName}</span>
                    <span className="font-mono text-xs">{year(p.publishedAt)}</span>
                  </Link>
                </li>
              )
            })}
          </ol>
        </div>
      </aside>
    </div>
  )
}
