// Live checks against the production dataset, using the same queries and helpers as the Studio.
// Run from studio/: npx sanity exec scripts/live-checks.ts --with-user-token
// Writes only one temporary private document (`test.check-gating`), deleted at the end.
import {createClient} from '@sanity/client'
import {getCliClient} from 'sanity/cli'
import {
  CONCEPT_EVOLUTION_QUERY,
  LINK_CONTEXT_QUERY,
  PAPER_LINEAGE_QUERY,
  PAPER_SOURCE_QUERY,
  PUBLIC_LINK_PROJECTION,
} from '../lib/queries'
import {paragraphFor, surnameOf} from '../lib/text'
import {RELATIONS} from '../schemaTypes/shared'

const client = getCliClient({apiVersion: '2025-02-19'}).withConfig({perspective: 'published', useCdn: false})
const anonymous = createClient({projectId: client.config().projectId, dataset: client.config().dataset, apiVersion: '2025-02-19', useCdn: false})

const results: {ok: boolean; name: string; detail: string}[] = []
async function check(name: string, run: () => Promise<string | true>) {
  try {
    const out = await run()
    results.push({ok: out === true, name, detail: out === true ? '' : out})
  } catch (err) {
    results.push({ok: false, name, detail: (err as Error).message})
  }
}

const BLIP2 = 'paper-2301-12597'
const FLAMINGO_TO_BLIP2 = 'influence-2204-14198-2301-12597'

// ---- counts and privacy
await check('dataset has 197 papers, 205 concepts, 197 full texts', async () => {
  const c = await client.fetch<{p: number; c: number; t: number}>(`{"p": count(*[_type=="paper"]), "c": count(*[_type=="concept"]), "t": count(*[_type=="paperText"])}`)
  return c.p === 197 && c.c === 205 && c.t === 197 ? true : JSON.stringify(c)
})
await check('anonymous (public) reads see papers but no full texts or questions', async () => {
  const c = await anonymous.fetch<{p: number; t: number; q: number}>(`{"p": count(*[_type=="paper"]), "t": count(*[_type=="paperText"]), "q": count(*[_type=="question"])}`)
  return c.p === 197 && c.t === 0 && c.q === 0 ? true : JSON.stringify(c)
})

// ---- the Studio views' own queries
await check('Lineage view (BLIP-2): 16 ancestors, none after it, grandparents counted', async () => {
  const d = await client.fetch<{paper: {shortName: string}; builtOn: unknown[]; ledTo: unknown[]; grandparents: number}>(PAPER_LINEAGE_QUERY, {id: BLIP2})
  return d.paper?.shortName === 'BLIP-2' && d.builtOn.length === 16 && d.ledTo.length === 0 && d.grandparents > 50
    ? true
    : `shortName=${d.paper?.shortName} builtOn=${d.builtOn.length} ledTo=${d.ledTo.length} grandparents=${d.grandparents}`
})
await check('Source view (BLIP-2): full text with ≥ 5 non-empty sections', async () => {
  const d = await client.fetch<{source: string; sections: {heading: string; text: string}[]}>(PAPER_SOURCE_QUERY, {id: BLIP2})
  const filled = d?.sections?.filter((s) => (s.text ?? '').length > 200).length ?? 0
  return filled >= 5 ? true : `sections with text: ${filled}`
})
await check('In-context view (Flamingo → BLIP-2): every sentence found inside a paragraph, author highlightable', async () => {
  const d = await client.fetch<{from: {author: string}; contexts: {text: string}[]; sections: {heading: string; text: string}[]}>(LINK_CONTEXT_QUERY, {id: FLAMINGO_TO_BLIP2})
  const found = d.contexts.filter((c) => paragraphFor(c.text, d.sections)).length
  const surname = surnameOf(d.from.author)
  const named = d.contexts.filter((c) => surname && c.text.includes(surname)).length
  return found === d.contexts.length && named > 0 ? true : `contexts=${d.contexts.length} inParagraph=${found} surname=${surname} named=${named}`
})
await check('In-context view, across all links: share of citation sentences located in their paragraph', async () => {
  const sample = await client.fetch<{_id: string}[]>(`*[_type=="influence" && count(citation.contexts) > 0][0...60]{_id}`)
  let total = 0
  let found = 0
  for (const {_id} of sample) {
    const d = await client.fetch<{contexts: {text: string}[]; sections: {text: string}[]}>(LINK_CONTEXT_QUERY, {id: _id})
    total += d.contexts.length
    found += d.contexts.filter((c) => paragraphFor(c.text, d.sections)).length
  }
  const share = found / total
  return share >= 0.9 ? true : `only ${(share * 100).toFixed(0)}% of ${total} sentences located (falls back to the sentence alone)`
})
await check('Evolution view (Q-Former): chain reaches Inducing-point attention via Perceiver resampler', async () => {
  type N = {name: string; buildsOn?: N[]}
  const d = await client.fetch<{root: N}>(CONCEPT_EVOLUTION_QUERY, {id: 'concept-q-former'})
  const names = (n: N, depth = 0): string[] => [`${depth}:${n.name}`, ...(n.buildsOn ?? []).flatMap((c) => names(c, depth + 1))]
  const all = names(d.root)
  return all.includes('1:Perceiver resampler') && all.some((n) => n.startsWith('3:Inducing-point attention')) ? true : all.join(' | ')
})

// ---- data the custom inputs rely on
await check('Evidence picker: every evidenceKey points at an existing citation sentence', async () => {
  const bad = await client.fetch<number>(`count(*[_type=="influence" && defined(evidenceKey) && !(evidenceKey in citation.contexts[]._key)])`)
  return bad === 0 ? true : `${bad} links with a dangling evidenceKey`
})
await check('Relation picker: every suggested relation is one the picker offers', async () => {
  const values = RELATIONS.map((r) => r.value)
  const bad = await client.fetch<number>(`count(*[_type=="influence" && defined(provenance.suggestedRelation) && !(provenance.suggestedRelation in $values)])`, {values})
  return bad === 0 ? true : `${bad} links suggest an unknown relation`
})
await check('arXiv input: every paper ID is in the normalised format', async () => {
  const bad = await client.fetch<string[]>(`*[_type=="paper" && !(arxivId match "*.*")].arxivId`)
  const malformed = (await client.fetch<string[]>(`*[_type=="paper"].arxivId`)).filter((id) => !/^\d{4}\.\d{4,5}$/.test(id))
  return bad.length === 0 && malformed.length === 0 ? true : `malformed: ${malformed.join(', ')}`
})

// ---- facts vs interpretation (the review rule), on a temporary private link
await check('Public projection hides the relation until a link is accepted, then shows it', async () => {
  const id = 'test.check-gating'
  await client.createOrReplace({
    _id: id,
    _type: 'influence',
    from: {_type: 'reference', _ref: 'paper-1706-03762'},
    to: {_type: 'reference', _ref: BLIP2},
    citation: {mentions: 1},
    relation: 'extends',
    explanation: 'test',
    provenance: {origin: 'curator', reviewDecision: 'proposed'},
  })
  try {
    const before = await client.fetch<{relation: string | null; explanation: string | null; mentions: number}>(`*[_id == $id][0]${PUBLIC_LINK_PROJECTION}`, {id})
    await client.patch(id).set({'provenance.reviewDecision': 'accepted'}).commit()
    const after = await client.fetch<{relation: string | null}>(`*[_id == $id][0]${PUBLIC_LINK_PROJECTION}`, {id})
    const hiddenBefore = before.relation === null && before.explanation === null && before.mentions === 1
    return hiddenBefore && after.relation === 'extends' ? true : `before=${JSON.stringify(before)} after=${JSON.stringify(after)}`
  } finally {
    await client.delete(id)
  }
})
await check('Seeded data: no link is accepted yet, so the public site shows only citation facts', async () => {
  const c = await anonymous.fetch<{accepted: number; withRelationVisible: number}>(
    `{"accepted": count(*[_type=="influence" && provenance.reviewDecision=="accepted"]), "withRelationVisible": count(*[_type=="influence"]${PUBLIC_LINK_PROJECTION}[defined(relation)])}`,
  )
  return c.accepted === 0 && c.withRelationVisible === 0 ? true : JSON.stringify(c)
})

// ---- report
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok ? '' : `\n      ${r.detail}`}`)
const failed = results.filter((r) => !r.ok).length
console.log(`\nlive checks: ${results.length - failed}/${results.length} passed`)
process.exitCode = failed ? 1 : 0
