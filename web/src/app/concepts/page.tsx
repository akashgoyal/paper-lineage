import type {Metadata} from 'next'
import Link from 'next/link'
import {sanityFetch} from '@/lib/sanity/client'
import {THEMES_QUERY} from '@/lib/sanity/queries'

export const metadata: Metadata = {title: 'Concepts', description: '25 research themes and the 180 ideas inside them, each credited to the paper that introduced it.'}

type Theme = {name: string; slug: string; summary: string; concepts: number}

export default async function ConceptsPage() {
  const themes = await sanityFetch<Theme[]>(THEMES_QUERY)
  return (
    <main className="mx-auto max-w-[1100px] px-4 pb-14 pt-10 md:px-8">
      <h1 className="m-0 font-serif text-4xl font-medium">Concepts</h1>
      <p className="mt-2 max-w-[680px] text-ink-2">
        {themes.length} themes, each grouping the ideas that grew up inside it. Every concept is credited to the paper that introduced it in this
        dataset.
      </p>
      <ul className="mt-8 grid list-none gap-3 p-0 md:grid-cols-2">
        {themes.map((t) => (
          <li key={t.slug}>
            <Link href={`/theme/${t.slug}`} className="flex h-full flex-col gap-1 rounded-xl border border-line bg-surface px-5 py-4 text-ink no-underline">
              <span className="flex items-baseline justify-between gap-3">
                <span className="font-serif text-xl">{t.name}</span>
                <span className="tabular shrink-0 font-mono text-xs text-muted">{t.concepts} concepts</span>
              </span>
              <span className="text-sm text-ink-2">{t.summary}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
