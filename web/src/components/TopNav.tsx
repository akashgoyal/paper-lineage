import Link from 'next/link'
import {sanityFetch} from '@/lib/sanity/client'
import {STATS_QUERY} from '@/lib/sanity/queries'
import type {Stats} from '@/lib/sanity/types'
import {CommandPalette} from './CommandPalette'
import {NavLinks} from './NavLinks'

export async function TopNav() {
  const stats = await sanityFetch<Stats>(STATS_QUERY)
  const items = [
    {href: '/', label: 'Ask'},
    {href: '/explore', label: 'Explore'},
    {href: '/concepts', label: 'Concepts'},
    ...(stats.stories > 0 ? [{href: '/stories', label: 'Stories'}] : []),
    {href: '/pipeline', label: 'Pipeline'},
  ]
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-surface">
      <div className="mx-auto flex max-w-[1440px] items-center gap-6 px-4 py-3 md:px-8">
        <Link href="/" className="font-serif text-[22px] font-semibold tracking-tight text-ink no-underline">
          Paper Lineage
        </Link>
        <NavLinks items={items} />
        <div className="flex-1" />
        <CommandPalette />
        <VerifiedMeter stats={stats} />
      </div>
    </header>
  )
}

export function VerifiedMeter({stats}: {stats: Stats}) {
  const label =
    stats.accepted > 0
      ? `${stats.accepted.toLocaleString('en-US')} of ${stats.links.toLocaleString('en-US')} links verified`
      : `Curation starting · ${stats.links.toLocaleString('en-US')} links to review`
  const pct = stats.links ? Math.round((stats.accepted / stats.links) * 1000) / 10 : 0
  return (
    <Link href="/pipeline" aria-label={label} className="hidden flex-col gap-1 text-xs text-ink-2 no-underline lg:flex">
      <span className="tabular">
        {stats.accepted > 0 ? (
          <>
            <b className="text-ink">{stats.accepted.toLocaleString('en-US')}</b> of {stats.links.toLocaleString('en-US')} links verified
          </>
        ) : (
          label
        )}
      </span>
      <span className="block h-1 w-[140px] rounded bg-line">
        <span className="block h-1 rounded bg-[var(--rel-extends)] transition-[width] duration-200" style={{width: `${pct}%`}} />
      </span>
    </Link>
  )
}
