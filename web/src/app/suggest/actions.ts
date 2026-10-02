'use server'

import {headers} from 'next/headers'
import {ARXIV_ID, fetchArxiv, normalizeArxivId, type ArxivMeta} from '@/lib/arxiv'
import {checkLimit, visitorKey} from '@/lib/ratelimit'
import {client, writeClient} from '@/lib/sanity/client'

export type SuggestState =
  | {step: 'idle'}
  | {step: 'error'; message: string; input?: string}
  | {step: 'exists'; shortName: string; slug: string}
  | {step: 'preview'; meta: ArxivMeta; outOfScope: boolean}
  | {step: 'done'; meta: ArxivMeta}

/** Step 1: look the paper up and show "Is this the paper?" (nothing is written). */
export async function lookupPaper(_: SuggestState, form: FormData): Promise<SuggestState> {
  const input = String(form.get('arxiv') ?? '')
  const id = normalizeArxivId(input)
  if (!ARXIV_ID.test(id)) return {step: 'error', message: 'That doesn’t look like an arXiv link or ID (e.g. 2301.12597).', input}
  const existing = await client.fetch<{shortName: string; slug: string} | null>(`*[_type == "paper" && arxivId == $id][0]{shortName, "slug": slug.current}`, {id})
  if (existing) return {step: 'exists', ...existing}
  try {
    const meta = await fetchArxiv(id)
    if (!meta) return {step: 'error', message: `arXiv has no paper with ID ${id}.`, input}
    return {step: 'preview', meta, outOfScope: !meta.primaryCategory.startsWith('cs.') && !meta.primaryCategory.startsWith('stat.ML')}
  } catch {
    return {step: 'error', message: 'Couldn’t reach arXiv just now. Please try again in a minute.', input}
  }
}

/** Step 2: record the suggestion as a `missing-paper` gap for curators (DESIGN_SPEC §6.7, decision D9). */
export async function submitSuggestion(_: SuggestState, form: FormData): Promise<SuggestState> {
  const id = normalizeArxivId(String(form.get('arxiv') ?? ''))
  const why = String(form.get('why') ?? '').slice(0, 280)
  if (!ARXIV_ID.test(id)) return {step: 'error', message: 'Missing arXiv ID.'}
  const h = await headers()
  const limit = await checkLimit(visitorKey(h.get('x-forwarded-for')?.split(',')[0] ?? h.get('x-real-ip')), 'action')
  if (!limit.ok) return {step: 'error', message: `You’ve reached the limit for now. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} min.`}

  const writer = writeClient()
  if (!writer) return {step: 'error', message: 'Suggestions are temporarily unavailable.'}
  const meta = await fetchArxiv(id).catch(() => null)
  if (!meta) return {step: 'error', message: `arXiv has no paper with ID ${id}.`}

  const gapId = `gap-missing-paper-${id.replace('.', '-')}`
  await writer
    .transaction()
    .createIfNotExists({
      _id: gapId,
      _type: 'gap',
      kind: 'missing-paper',
      title: `Add ${meta.title} (${meta.year})`,
      detail: why ? `Suggested by a visitor: ${why}` : 'Suggested by a visitor.',
      suggestedArxivIds: [id],
      questionCount: 0,
      status: 'open',
    })
    .patch(gapId, (p) => p.inc({questionCount: 1}))
    .commit({visibility: 'async'})
  return {step: 'done', meta}
}
