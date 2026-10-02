import {createClient, type QueryParams} from '@sanity/client'

export const projectId = 'jd22zcim'
export const dataset = 'production'
export const apiVersion = '2025-02-19'

// Public, read-only: the dataset is public and the site only reads published documents.
export const client = createClient({projectId, dataset, apiVersion, useCdn: true, perspective: 'published'})

/** Every Sanity read is tagged `sanity`; <SanityLive> expires that tag when the Live Content API reports a change. */
export const SANITY_TAG = 'sanity'

export async function sanityFetch<T>(query: string, params: QueryParams = {}): Promise<T> {
  return client.fetch<T>(query, params, {next: {revalidate: false, tags: [SANITY_TAG]}})
}

/** Server-only writer for visitor questions, gaps and storyline drafts (narrow token, never sent to the browser). */
export function writeClient() {
  const token = process.env.SANITY_WRITE_TOKEN
  if (!token) return null
  return createClient({projectId, dataset, apiVersion, useCdn: false, token})
}
