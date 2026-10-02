import type {EffectHandler} from '@sanity/workflow-engine'
import {content} from './runtime.ts'

// Bindings carry GDR URIs (dataset:<project>:<dataset>:<id>); handlers work with the bare document id.
const bare = (id: unknown) => String(id ?? '').split(':').at(-1)!.replace(/^drafts\./, '')
const linkCounts = (paperId: string) =>
  content.fetch<{open: number; accepted: number; total: number}>(
    `{
      "open": count(*[_type == "influence" && to._ref == $id && !(_id in path("drafts.**")) && provenance.reviewDecision == "proposed"]),
      "accepted": count(*[_type == "influence" && to._ref == $id && !(_id in path("drafts.**")) && provenance.reviewDecision == "accepted"]),
      "total": count(*[_type == "influence" && to._ref == $id && !(_id in path("drafts.**"))])
    }`,
    {id: paperId},
  )

type Paper = {_id: string; arxivId?: string; title?: string; abstract?: string; publishedAt?: string}

/** arXiv Atom → the fields a placeholder paper (created from an Inbox gap) is missing. */
async function arxivMetadata(arxivId: string) {
  const res = await fetch(`https://export.arxiv.org/api/query?id_list=${encodeURIComponent(arxivId)}`, {headers: {'user-agent': 'paper-lineage-workflow'}})
  if (!res.ok) throw new Error(`arXiv responded ${res.status}`)
  const entry = (await res.text()).split('<entry>')[1]
  if (!entry) throw new Error(`arXiv has no entry for ${arxivId}`)
  const tag = (name: string) => entry.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))?.[1]?.replace(/\s+/g, ' ').trim()
  const authors = [...entry.matchAll(/<name>([\s\S]*?)<\/name>/g)].map((m) => m[1].trim())
  return {title: tag('title'), abstract: tag('summary'), publishedAt: tag('published')?.slice(0, 10), authors}
}

export const handlers: Record<string, EffectHandler> = {
  // Fills in a placeholder paper draft; an already-complete paper is left untouched.
  'fetch-arxiv': async ({paperId}, {log}) => {
    const id = bare(paperId)
    const [draft, published] = await Promise.all([content.getDocument<Paper>(`drafts.${id}`), content.getDocument<Paper>(id)])
    const paper = draft ?? published
    if (!paper) throw new Error(`Paper ${id} not found`)
    const placeholder = !paper.abstract || !paper.title || paper.title.startsWith('arXiv:')
    if (!placeholder || !paper.arxivId) return {outputs: {title: paper.title ?? id, updated: false}}
    const meta = await arxivMetadata(paper.arxivId)
    const base = draft ?? {...published!, _id: `drafts.${id}`}
    await content.createOrReplace({...base, _id: `drafts.${id}`, _type: 'paper', ...meta})
    log('fetched arXiv metadata', {id, title: meta.title})
    return {outputs: {title: meta.title ?? id, updated: true}}
  },

  'check-links': async ({paperId}) => ({outputs: {...(await linkCounts(bare(paperId))), at: new Date().toISOString()}}),
  'recheck-links': async ({paperId}) => ({outputs: {...(await linkCounts(bare(paperId))), at: new Date().toISOString()}}),

  // The second line of defence behind the engine's gate: never publish over unreviewed links.
  'publish-bundle': async ({paperId}, {log}) => {
    const id = bare(paperId)
    const {open} = await linkCounts(id)
    if (open > 0) throw new Error(`${open} lineage links into ${id} are still unreviewed`)
    const draft = await content.getDocument<Paper & {_rev?: string}>(`drafts.${id}`)
    if (draft) {
      const {_rev, ...doc} = draft
      void _rev
      await content.transaction().createOrReplace({...doc, _id: id}).delete(`drafts.${id}`).commit()
      log('published paper', {id})
    }
    return {outputs: {published: Boolean(draft), at: new Date().toISOString()}}
  },
}
