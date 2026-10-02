// Ask display tools (DESIGN_SPEC §5.6, decision D5). The model never writes card content directly: it calls
// these tools with ids and short labels, and the server resolves every card from Sanity (or re-reads the
// Knowledge Base), enforcing the verification rules. Invalid input becomes a tool error the model can fix.
import 'server-only'
import {randomUUID} from 'node:crypto'
import {z} from 'zod'
import {client, writeClient} from '../sanity/client'
import type {Relation} from '../sanity/types'
import type {Card, CardPaper, LinkStatus} from './cards'
import {readKnowledgeBaseEntry} from './context-mcp'
import {inDateOrder, isVerbatim} from './verify'

/** Accumulates what an answer relied on, for the sources line and the stored question. */
export class AskContext {
  papers = new Set<string>()
  links = new Map<string, 'verified' | 'cites'>()
  endpoints = new Set<'groq' | 'knowledge-base'>()
  outcome: 'answered' | 'partial' | 'unanswered' | null = null
  gap: {kind: string; title: string; paperIds?: string[]; arxivIds?: string[]} | null = null
  sources() {
    const values = [...this.links.values()]
    return {verified: values.filter((v) => v === 'verified').length, unreviewed: values.filter((v) => v === 'cites').length, papers: this.papers.size}
  }
}

export class ToolInputError extends Error {}

const PAPER = `_id, shortName, "slug": slug.current, "year": string::split(publishedAt, "-")[0], title, kind, publishedAt`

async function papersById(ids: string[]) {
  const rows = await client.fetch<(CardPaper & {publishedAt: string})[]>(`*[_type == "paper" && _id in $ids]{${PAPER}}`, {ids})
  const byId = new Map(rows.map((r) => [r._id, r]))
  const missing = ids.filter((id) => !byId.has(id))
  if (missing.length) throw new ToolInputError(`Unknown paper id(s): ${missing.join(', ')}. Use _id values returned by groq_query (they look like "paper-2301-12597").`)
  return ids.map((id) => byId.get(id)!)
}

const strip = ({publishedAt: _p, ...rest}: CardPaper & {publishedAt?: string}): CardPaper => rest

// ---------------------------------------------------------------- schemas

const ids = (min: number, max: number) => z.array(z.string().min(1)).min(min).max(max)
const sourceRef = z.union([
  z.object({kind: z.literal('doc'), id: z.string()}),
  z.object({kind: z.literal('kb'), kb: z.string(), path: z.string()}),
])

export const inputSchemas = {
  showPapers: z.object({ids: ids(1, 6), caption: z.string().max(80).optional()}),
  showChain: z.object({paperIds: ids(2, 6), conceptSlugs: z.array(z.string()).max(6).optional()}),
  showComparison: z.object({
    a: z.string(),
    b: z.string(),
    rows: z.array(z.object({label: z.string().max(24), a: z.string().max(140), b: z.string().max(140), sources: z.array(sourceRef).min(1)})).min(1).max(4),
  }),
  showQuote: z.object({
    source: z.union([
      z.object({kind: z.literal('kb'), kb: z.string(), path: z.string(), paperId: z.string()}),
      z.object({kind: z.literal('link'), influenceId: z.string(), contextKey: z.string().optional()}),
    ]),
    quote: z.string().max(600),
  }),
  suggestFollowUps: z.object({items: z.array(z.string().min(3).max(90)).min(2).max(4)}),
  reportOutcome: z.object({
    outcome: z.enum(['answered', 'partial', 'unanswered']),
    gap: z
      .object({
        kind: z.enum(['missing-link', 'missing-paper', 'unanswered', 'weak-evidence']),
        title: z.string().max(90),
        paperIds: z.array(z.string()).max(6).optional(),
        arxivIds: z.array(z.string()).max(6).optional(),
      })
      .optional(),
  }),
  draftStoryline: z.object({title: z.string().min(3).max(80), paperIds: ids(2, 8)}),
} as const

export type DisplayToolName = keyof typeof inputSchemas

// ---------------------------------------------------------------- tool definitions for the API

const S = {type: 'string'} as const
const strArr = (minItems: number, maxItems: number) => ({type: 'array', items: S, minItems, maxItems}) as const

export const DISPLAY_TOOLS = [
  {
    name: 'showPapers',
    description: 'Show 1–6 papers as cards. Pass paper _id values from groq_query. Use for "which papers…" lists and to introduce papers you discuss.',
    input_schema: {type: 'object', additionalProperties: false, required: ['ids'], properties: {ids: strArr(1, 6), caption: S}},
  },
  {
    name: 'showChain',
    description:
      'Show a lineage chain of 2–6 papers, OLDEST FIRST, as a card. The server looks up the link between each consecutive pair and shows its real status (verified relation, or "cites n×", or no link). Optionally pass concept slugs (same order as papers) to label what each paper contributed.',
    input_schema: {
      type: 'object',
      additionalProperties: false,
      required: ['paperIds'],
      properties: {paperIds: strArr(2, 6), conceptSlugs: strArr(0, 6)},
    },
  },
  {
    name: 'showComparison',
    description:
      'Compare two papers in a table of 1–4 rows. Each row needs ≥1 source: {kind:"doc", id} for a Sanity document you read, or {kind:"kb", kb, path} for a Knowledge Base entry you read. The server adds a "Shared concepts" row itself.',
    input_schema: {
      type: 'object',
      additionalProperties: false,
      required: ['a', 'b', 'rows'],
      properties: {
        a: S,
        b: S,
        rows: {
          type: 'array',
          minItems: 1,
          maxItems: 4,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['label', 'a', 'b', 'sources'],
            properties: {
              label: S,
              a: S,
              b: S,
              sources: {
                type: 'array',
                minItems: 1,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['kind'],
                  properties: {kind: {type: 'string', enum: ['doc', 'kb']}, id: S, kb: S, path: S},
                },
              },
            },
          },
        },
      },
    },
  },
  {
    name: 'showQuote',
    description:
      'Show a verbatim quote. Either from a Knowledge Base entry ({kind:"kb", kb, path, paperId} plus the exact quote text, which the server re-reads and must find verbatim) or from a lineage link\'s captured citation sentence ({kind:"link", influenceId, contextKey?}; the server uses the stored sentence). Max 2 per answer.',
    input_schema: {
      type: 'object',
      additionalProperties: false,
      required: ['source', 'quote'],
      properties: {
        quote: S,
        source: {
          type: 'object',
          additionalProperties: false,
          required: ['kind'],
          properties: {kind: {type: 'string', enum: ['kb', 'link']}, kb: S, path: S, paperId: S, influenceId: S, contextKey: S},
        },
      },
    },
  },
  {
    name: 'suggestFollowUps',
    description: 'Offer 2–4 short follow-up questions the dataset can answer. Call once, near the end.',
    input_schema: {type: 'object', additionalProperties: false, required: ['items'], properties: {items: strArr(2, 4)}},
  },
  {
    name: 'reportOutcome',
    description:
      'Call exactly once at the end. outcome: "answered", "partial" (relied only on unreviewed links, or incomplete), or "unanswered" (the dataset does not cover it). For partial/unanswered, describe the gap so curators can fix it.',
    input_schema: {
      type: 'object',
      additionalProperties: false,
      required: ['outcome'],
      properties: {
        outcome: {type: 'string', enum: ['answered', 'partial', 'unanswered']},
        gap: {
          type: 'object',
          additionalProperties: false,
          required: ['kind', 'title'],
          properties: {kind: {type: 'string', enum: ['missing-link', 'missing-paper', 'unanswered', 'weak-evidence']}, title: S, paperIds: strArr(0, 6), arxivIds: strArr(0, 6)},
        },
      },
    },
  },
  {
    name: 'draftStoryline',
    description: 'Only when the visitor asks to make a story: save the chain (2–8 paper ids, oldest first) as a private draft for curators.',
    input_schema: {type: 'object', additionalProperties: false, required: ['title', 'paperIds'], properties: {title: S, paperIds: strArr(2, 8)}},
  },
]

// ---------------------------------------------------------------- resolvers

async function linkStatuses(pairs: [string, string][], ctx: AskContext): Promise<LinkStatus[]> {
  const rows = await client.fetch<{_id: string; from: string; to: string; decision: string; relation: Relation | null; mentions: number; methodMentions: number}[]>(
    `*[_type == "influence" && from._ref in $froms && to._ref in $tos]{_id, "from": from._ref, "to": to._ref, "decision": provenance.reviewDecision,
      "relation": select(provenance.reviewDecision == "accepted" => relation), "mentions": coalesce(citation.mentions, 0), "methodMentions": coalesce(citation.methodMentions, 0)}`,
    {froms: pairs.map((p) => p[0]), tos: pairs.map((p) => p[1])},
  )
  return pairs.map(([from, to]) => {
    const l = rows.find((r) => r.from === from && r.to === to && r.decision !== 'rejected')
    if (!l) return {status: 'none'}
    if (l.decision === 'accepted' && l.relation) {
      ctx.links.set(l._id, 'verified')
      return {status: 'verified', relation: l.relation, mentions: l.mentions, linkId: l._id}
    }
    ctx.links.set(l._id, 'cites')
    return {status: 'cites', mentions: l.mentions, methodMentions: l.methodMentions, linkId: l._id}
  })
}

export async function resolveTool(name: DisplayToolName, raw: unknown, ctx: AskContext): Promise<{card?: Card; summary: string}> {
  const parsed = inputSchemas[name].safeParse(raw)
  if (!parsed.success) throw new ToolInputError(`Invalid input for ${name}: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`)
  const input = parsed.data as never

  switch (name) {
    case 'showPapers': {
      const {ids: list, caption} = input as z.infer<typeof inputSchemas.showPapers>
      const papers = await papersById(list)
      const counts = await client.fetch<{_id: string; builtOn: number; builtOnIt: number}[]>(
        `*[_id in $ids]{_id, "builtOn": count(*[_type == "influence" && to._ref == ^._id]), "builtOnIt": count(*[_type == "influence" && from._ref == ^._id])}`,
        {ids: list},
      )
      list.forEach((id) => ctx.papers.add(id))
      return {
        card: {type: 'papers', caption, papers: papers.map((p) => ({...strip(p), ...counts.find((c) => c._id === p._id)!}))},
        summary: `Shown ${papers.length} paper cards: ${papers.map((p) => p.shortName).join(', ')}.`,
      }
    }
    case 'showChain': {
      const {paperIds, conceptSlugs} = input as z.infer<typeof inputSchemas.showChain>
      const papers = await papersById(paperIds)
      if (!inDateOrder(papers.map((p) => p.publishedAt))) throw new ToolInputError('paperIds must be ordered oldest → newest by publication date.')
      const concepts = conceptSlugs?.length
        ? await client.fetch<{name: string; slug: string}[]>(`*[_type == "concept" && slug.current in $s]{name, "slug": slug.current}`, {s: conceptSlugs})
        : []
      const links = await linkStatuses(paperIds.slice(1).map((to, i) => [paperIds[i], to]), ctx)
      paperIds.forEach((id) => ctx.papers.add(id))
      const describe = links.map((l, i) => `${papers[i].shortName}→${papers[i + 1].shortName}: ${l.status === 'verified' ? l.relation : l.status === 'cites' ? `cites ${l.mentions}× (unreviewed)` : 'no link'}`)
      return {
        card: {type: 'chain', steps: papers.map((p, i) => ({paper: strip(p), concept: concepts.find((c) => c.slug === conceptSlugs?.[i])})), links},
        summary: `Chain shown. Link statuses: ${describe.join('; ')}. Do not describe unreviewed links with relation words.`,
      }
    }
    case 'showComparison': {
      const {a, b, rows} = input as z.infer<typeof inputSchemas.showComparison>
      const [pa, pb] = await papersById([a, b])
      const docIds = rows.flatMap((r) => r.sources).filter((s): s is {kind: 'doc'; id: string} => s.kind === 'doc').map((s) => s.id)
      if (docIds.length) {
        const found = await client.fetch<string[]>(`*[_id in $ids]._id`, {ids: docIds})
        const missing = docIds.filter((id) => !found.includes(id))
        if (missing.length) throw new ToolInputError(`Row source document(s) not found: ${missing.join(', ')}`)
      }
      if (rows.some((r) => r.sources.some((s) => s.kind === 'kb'))) ctx.endpoints.add('knowledge-base')
      const shared = await client.fetch<{name: string; slug: string}[]>(
        `*[_type == "concept" && level == "concept" && (references($a) || _id in *[_id == $a][0].uses[]._ref) && (references($b) || _id in *[_id == $b][0].uses[]._ref)]{name, "slug": slug.current}[0...6]`,
        {a, b},
      )
      ctx.papers.add(a).add(b)
      return {card: {type: 'comparison', a: strip(pa), b: strip(pb), shared, rows: rows.map(({label, a, b}) => ({label, a, b}))}, summary: `Comparison table shown (${rows.length} rows, ${shared.length} shared concepts).`}
    }
    case 'showQuote': {
      const {source, quote} = input as z.infer<typeof inputSchemas.showQuote>
      if (source.kind === 'link') {
        const link = await client.fetch<{contexts: {_key: string; section?: string; text: string}[]; evidenceKey?: string; to: string; mentions: number} | null>(
          `*[_type == "influence" && _id == $id][0]{"contexts": citation.contexts, evidenceKey, "to": to->shortName, "mentions": citation.mentions}`,
          {id: source.influenceId},
        )
        if (!link?.contexts?.length) throw new ToolInputError('That link has no captured citation sentence.')
        const ctxEntry = link.contexts.find((c) => c._key === (source.contextKey ?? link.evidenceKey)) ?? link.contexts[0]
        ctx.links.set(source.influenceId, ctx.links.get(source.influenceId) ?? 'cites')
        return {card: {type: 'quote', text: ctxEntry.text, paper: link.to, section: ctxEntry.section, mentions: link.mentions, via: 'citation'}, summary: 'Quote shown from the stored citation sentence.'}
      }
      const [paper] = await papersById([source.paperId])
      const entry = await readKnowledgeBaseEntry(source.kb, source.path)
      if (!entry) throw new ToolInputError('Could not re-read that Knowledge Base entry to verify the quote.')
      if (!isVerbatim(quote, entry)) throw new ToolInputError('Quote not found verbatim in that Knowledge Base entry. Copy the exact text, or omit the quote.')
      const section = entry.match(/§\s?([\w .\-]+)|Section[:\s]+([\w .\-]+)/)?.[1]?.trim()
      ctx.endpoints.add('knowledge-base')
      ctx.papers.add(paper._id)
      return {card: {type: 'quote', text: quote.replace(/^["“]|["”]$/g, ''), paper: paper.shortName, section, via: 'knowledge-base'}, summary: 'Quote verified and shown.'}
    }
    case 'suggestFollowUps': {
      const {items} = input as z.infer<typeof inputSchemas.suggestFollowUps>
      return {card: {type: 'followups', items}, summary: 'Follow-ups shown.'}
    }
    case 'reportOutcome': {
      const {outcome, gap} = input as z.infer<typeof inputSchemas.reportOutcome>
      ctx.outcome = outcome
      ctx.gap = outcome !== 'answered' ? (gap ?? {kind: 'unanswered', title: 'Visitor question the dataset could not answer'}) : null
      return {summary: 'Outcome recorded.'}
    }
    case 'draftStoryline': {
      const {title, paperIds} = input as z.infer<typeof inputSchemas.draftStoryline>
      await papersById(paperIds)
      const links = await linkStatuses(paperIds.slice(1).map((to, i) => [paperIds[i], to]), ctx)
      const steps = links.filter((l): l is Extract<LinkStatus, {linkId: string}> => l.status !== 'none')
      if (!steps.length) throw new ToolInputError('None of these consecutive papers are linked in the dataset; there is no chain to save.')
      const writer = writeClient()
      if (!writer) throw new ToolInputError('Saving storyline drafts is unavailable right now; tell the visitor.')
      const draftId = `drafts.storyline-${randomUUID()}`
      await writer.create({
        _id: draftId,
        _type: 'storyline',
        title,
        slug: {_type: 'slug', current: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)},
        origin: 'ai',
        featured: false,
        steps: steps.map((l, i) => ({_key: `s${i}`, _type: 'step', influence: {_type: 'reference', _ref: l.linkId}})),
      })
      const unreviewed = steps.filter((s) => s.status !== 'verified').length
      return {card: {type: 'storyline-draft', title, draftId, unreviewedSteps: unreviewed}, summary: `Draft saved with ${steps.length} steps (${unreviewed} need review before publishing).`}
    }
  }
}

/** Store the anonymised question (private id path) and, for weak answers, create or bump a curator gap. */
export async function recordQuestion(text: string, ctx: AskContext) {
  const writer = writeClient()
  if (!writer) return
  const questionId = `questions.${randomUUID()}`
  const tx = writer.transaction()
  let gapId: string | null = null
  if (ctx.gap) {
    const key = ctx.gap.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)
    gapId = `gap-${ctx.gap.kind}-${key}`
    tx.createIfNotExists({
      _id: gapId,
      _type: 'gap',
      kind: ctx.gap.kind,
      title: ctx.gap.title,
      detail: 'Created from visitor questions on the Ask page.',
      papers: (ctx.gap.paperIds ?? []).map((id, i) => ({_key: `p${i}`, _type: 'reference', _ref: id, _weak: true})),
      suggestedArxivIds: ctx.gap.arxivIds ?? [],
      questionCount: 0,
      status: 'open',
    }).patch(gapId, (p) => p.inc({questionCount: 1}))
  }
  tx.create({
    _id: questionId,
    _type: 'question',
    text: text.slice(0, 500),
    askedAt: new Date().toISOString(),
    outcome: ctx.outcome ?? 'answered',
    endpoints: [...ctx.endpoints],
    citedPapers: [...ctx.papers].map((id, i) => ({_key: `p${i}`, _type: 'reference', _ref: id, _weak: true})),
    citedLinks: [...ctx.links.keys()].map((id, i) => ({_key: `l${i}`, _type: 'reference', _ref: id, _weak: true})),
    ...(gapId ? {gap: {_type: 'reference', _ref: gapId, _weak: true}} : {}),
  })
  await tx.commit({visibility: 'async'}).catch((err) => console.error('[ask] failed to record question', err))
}
