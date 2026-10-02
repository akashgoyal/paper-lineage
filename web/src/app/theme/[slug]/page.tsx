import type {Metadata} from 'next'
import Link from 'next/link'
import {notFound} from 'next/navigation'
import {Breadcrumbs} from '@/components/ui'
import {year} from '@/lib/format'
import {sanityFetch} from '@/lib/sanity/client'
import {THEME_QUERY, THEMES_QUERY} from '@/lib/sanity/queries'

type ThemeConcept = {
  name: string
  slug: string
  summary: string
  by: {shortName: string; slug: string; publishedAt: string} | null
  users: {publishedAt: string}[]
}
type Theme = {name: string; slug: string; summary: string; concepts: ThemeConcept[]}

export async function generateStaticParams() {
  const themes = await sanityFetch<{slug: string}[]>(THEMES_QUERY)
  return themes.map(({slug}) => ({slug}))
}

export async function generateMetadata({params}: PageProps<'/theme/[slug]'>): Promise<Metadata> {
  const {slug} = await params
  const theme = await sanityFetch<Theme | null>(THEME_QUERY, {slug})
  return theme ? {title: theme.name, description: theme.summary} : {}
}

// Bar from the introducing paper's year (or the first use) to the latest use in the dataset (DESIGN_SPEC §6.6).
function span(c: ThemeConcept) {
  const years = c.users.map((u) => Number(year(u.publishedAt))).filter(Boolean)
  const start = c.by ? Number(year(c.by.publishedAt)) : Math.min(...years)
  const end = Math.max(start, ...years)
  return {start, end}
}

export default async function ThemePage({params}: PageProps<'/theme/[slug]'>) {
  const {slug} = await params
  const theme = await sanityFetch<Theme | null>(THEME_QUERY, {slug})
  if (!theme) notFound()

  const rows = theme.concepts.map((c) => ({c, ...span(c)})).filter((r) => Number.isFinite(r.start)).sort((a, b) => a.start - b.start || a.c.name.localeCompare(b.c.name))
  const min = Math.min(...rows.map((r) => r.start))
  const max = Math.max(...rows.map((r) => r.end), min + 1)
  const pos = (y: number) => ((y - min) / (max - min)) * 100

  return (
    <main className="mx-auto max-w-[1100px] px-4 pb-14 pt-8 md:px-8">
      <Breadcrumbs items={[{label: 'Concepts', href: '/concepts'}, {label: theme.name}]} />
      <h1 className="m-0 font-serif text-4xl font-medium">{theme.name}</h1>
      <p className="mt-2 max-w-[720px] font-serif text-xl">{theme.summary}</p>

      <section aria-label="Timeline" className="mt-8 hidden rounded-xl border border-line bg-surface px-6 py-5 md:block">
        <div className="relative mb-3 ml-[260px] h-4 font-mono text-xs text-muted" aria-hidden>
          {Array.from({length: max - min + 1}, (_, i) => min + i).map((y) => (
            <span key={y} className="absolute -translate-x-1/2" style={{left: `${pos(y)}%`}}>
              {y}
            </span>
          ))}
        </div>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {rows.map(({c, start, end}) => (
            <li key={c.slug} className="grid grid-cols-[250px_minmax(0,1fr)] items-center gap-2.5">
              <Link href={`/concept/${c.slug}`} className="truncate text-sm text-ink no-underline" title={c.name}>
                {c.name}
              </Link>
              <div className="relative h-5">
                <span
                  aria-hidden
                  className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-[var(--rel-extends)]"
                  style={{left: `${pos(start)}%`, width: `max(8px, ${pos(end) - pos(start)}%)`}}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <table className="mt-8 w-full border-collapse overflow-hidden rounded-xl border border-line bg-surface text-sm">
        <caption className="sr-only">Concepts in {theme.name}</caption>
        <thead>
          <tr className="bg-ground text-left">
            <th scope="col" className="px-4 py-2.5 font-medium">Concept</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Introduced by</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Years</th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">Papers</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({c, start, end}) => (
            <tr key={c.slug} className="border-t border-line">
              <td className="px-4 py-2.5">
                <Link href={`/concept/${c.slug}`}>{c.name}</Link>
                <div className="text-xs text-muted">{c.summary}</div>
              </td>
              <td className="px-4 py-2.5">{c.by ? <Link href={`/paper/${c.by.slug}`}>{c.by.shortName}</Link> : <span className="text-muted">—</span>}</td>
              <td className="tabular px-4 py-2.5 font-mono text-xs">{start === end ? start : `${start}–${end}`}</td>
              <td className="tabular px-4 py-2.5 text-right font-mono text-xs">{c.users.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
