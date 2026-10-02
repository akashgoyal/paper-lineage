import type {Metadata} from 'next'
import Link from 'next/link'
import {EmptyState} from '@/components/ui'
import {sanityFetch} from '@/lib/sanity/client'
import {STORIES_QUERY} from '@/lib/sanity/queries'

export const metadata: Metadata = {title: 'Stories', description: 'Curated narratives along verified lineage links.'}

type Story = {title: string; slug: string; dek?: string; steps: number}

export default async function StoriesPage() {
  const stories = await sanityFetch<Story[]>(STORIES_QUERY)
  return (
    <main className="mx-auto max-w-[900px] px-4 pb-14 pt-10">
      <h1 className="m-0 font-serif text-4xl font-medium">Stories</h1>
      <p className="mt-2 text-ink-2">Curated walks through the lineage, each step a verified link.</p>
      {stories.length ? (
        <ul className="mt-6 flex list-none flex-col gap-3 p-0">
          {stories.map((s) => (
            <li key={s.slug}>
              <Link href={`/story/${s.slug}`} className="block rounded-xl border border-line bg-surface p-5 text-ink no-underline">
                <span className="font-serif text-2xl">{s.title}</span>
                {s.dek && <span className="mt-1 block text-ink-2">{s.dek}</span>}
                <span className="mt-2 block font-mono text-xs text-muted">{s.steps} steps</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-6">
          <EmptyState action={<Link href="/">Ask a question →</Link>}>No stories published yet.</EmptyState>
        </div>
      )}
    </main>
  )
}
