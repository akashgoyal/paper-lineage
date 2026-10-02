import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {Breadcrumbs} from '@/components/ui'
import {client, sanityFetch} from '@/lib/sanity/client'
import {STORY_QUERY, STORY_SLUGS_QUERY} from '@/lib/sanity/queries'
import {RichText, type Block} from './RichText'
import {StoryBody, type StoryStep} from './StoryBody'

type Story = {title: string; slug: string; dek?: string; _updatedAt: string; intro?: Block[]; steps: StoryStep[]}

export async function generateStaticParams() {
  const slugs = await client.fetch<string[]>(STORY_SLUGS_QUERY)
  return slugs.map((slug) => ({slug}))
}

export async function generateMetadata({params}: PageProps<'/story/[slug]'>): Promise<Metadata> {
  const story = await sanityFetch<Story | null>(STORY_QUERY, {slug: (await params).slug})
  return story ? {title: story.title, description: story.dek} : {}
}

export default async function StoryPage({params}: PageProps<'/story/[slug]'>) {
  const story = await sanityFetch<Story | null>(STORY_QUERY, {slug: (await params).slug})
  if (!story || !story.steps?.length) notFound()
  return (
    <main className="mx-auto max-w-[1100px] px-4 pb-16 pt-6">
      <Breadcrumbs items={[{label: 'Stories', href: '/stories'}, {label: story.title}]} />
      <header className="mt-4 max-w-[680px]">
        <h1 className="m-0 font-serif text-4xl font-medium leading-tight md:text-5xl">{story.title}</h1>
        {story.dek && <p className="mt-3 text-lg text-ink-2">{story.dek}</p>}
        <p className="mt-2 font-mono text-xs text-muted">
          {story.steps.length} steps · curated by a person · updated {story._updatedAt.slice(0, 10)}
        </p>
      </header>
      {story.intro && (
        <div className="mt-6 max-w-[680px]">
          <RichText value={story.intro} />
        </div>
      )}
      <StoryBody steps={story.steps} />
    </main>
  )
}
