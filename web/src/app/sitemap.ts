import type {MetadataRoute} from 'next'
import {sanityFetch} from '@/lib/sanity/client'
import {SITEMAP_QUERY} from '@/lib/sanity/queries'
import {SITE_URL} from '@/lib/site'

type Entry = {slug: string; _updatedAt: string}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const docs = await sanityFetch<Record<'papers' | 'concepts' | 'themes' | 'stories', Entry[]>>(SITEMAP_QUERY)
  const pages = ['', '/explore', '/concepts', '/pipeline', '/about', '/suggest', ...(docs.stories.length ? ['/stories'] : [])]
  const at = (base: string, list: Entry[]) => list.map((d) => ({url: `${SITE_URL}${base}/${d.slug}`, lastModified: d._updatedAt}))
  return [
    ...pages.map((p) => ({url: `${SITE_URL}${p}`})),
    ...at('/paper', docs.papers),
    ...at('/concept', docs.concepts),
    ...at('/theme', docs.themes),
    ...at('/story', docs.stories),
  ]
}
