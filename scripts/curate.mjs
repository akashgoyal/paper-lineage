#!/usr/bin/env node
// Turns the raw citation graph (data/raw/graph.json) into the lineage dataset (data/curated/).
//
//  1. Influence filter: keep a citation as a lineage edge only if it is cited 2+ times or inside
//     a Method-like section. Keep a paper only if strong edges connect it back to the root.
//  2. Relation: proposed from the citation sentences (cue phrases + section), with a confidence.
//  3. Concepts: tagged from data/curated/concepts.json (aliases matched in title + abstract).
//  4. Evidence: the most informative citation sentence, labelled with its section.
//
// Every edge produced here is `origin: 'harvest'`, `reviewDecision: 'proposed'`: it is a
// machine-mined claim until a curator accepts it in the Lineage Desk.
//
// Usage: node scripts/curate.mjs

import {readFile, writeFile} from 'node:fs/promises'

const graph = JSON.parse(await readFile('data/raw/graph.json', 'utf8'))
const concepts = JSON.parse(await readFile('data/curated/concepts.json', 'utf8'))
const overrides = JSON.parse(await readFile('data/curated/overrides.json', 'utf8'))
const kindOf = (id) => Object.entries(overrides.kinds).find(([, ids]) => ids.includes(id))?.[0] ?? 'method'

// Well-known short names; everything else falls back to the text before a colon in the title.
const SHORT_NAMES = {
  '1706.03762': 'Transformer', '1512.03385': 'ResNet', '2103.00020': 'CLIP', '2010.11929': 'ViT',
  '2005.14165': 'GPT-3', '1910.10683': 'T5', '2102.05918': 'ALIGN', '2106.13884': 'Frozen',
  '2203.02155': 'InstructGPT', '2203.15556': 'Chinchilla', '2109.01652': 'FLAN', '2210.11416': 'Flan-T5 / Flan-PaLM',
  '2110.08207': 'T0', '1409.0473': 'Bahdanau attention', '1409.1556': 'VGG', '1911.05722': 'MoCo',
  '2002.05709': 'SimCLR', '1711.00937': 'VQ-VAE', '1802.05365': 'ELMo', '1711.05101': 'AdamW',
  '2208.10442': 'BEiT-3', '2102.12092': 'DALL·E', '2107.07651': 'ALBEF', '2201.12086': 'BLIP', '2301.12597': 'BLIP-2',
  '2204.14198': 'Flamingo', '2205.01068': 'OPT', '1810.04805': 'BERT', '1905.03197': 'UniLM', '2211.07636': 'EVA',
  '1405.0312': 'MS COCO', '1602.07332': 'Visual Genome', '2111.02114': 'LAION-400M', '2102.08981': 'Conceptual 12M',
  '1502.03167': 'BatchNorm', '1707.07998': 'Bottom-Up Top-Down attention', '1908.02265': 'ViLBERT',
  '1909.11740': 'UNITER', '2004.06165': 'Oscar', '1908.07490': 'LXMERT', '2108.10904': 'SimVLM', '2205.01917': 'CoCa',
  '2106.08254': 'BEiT', '2208.06366': 'BEiT v2', '2111.07991': 'LiT', '2111.11432': 'Florence', '2204.02311': 'PaLM',
  '2001.08361': 'Kaplan scaling laws', '1909.08053': 'Megatron-LM', '1909.08593': 'RLHF for LMs (Ziegler)',
  '2103.14030': 'Swin', '1907.11692': 'RoBERTa', '1906.08237': 'XLNet', '2006.06666': 'VirTex',
  '1805.00932': 'Instagram hashtag pre-training', '1912.11370': 'BiT', '1706.02677': 'Goyal large-batch SGD',
  '1505.00468': 'VQA', '1612.00837': 'VQA v2', '2112.11446': 'Gopher', '2202.03052': 'OFA', '2111.02387': 'METER',
}

// Cue phrases in the citing sentence → relation. Order matters: first match wins.
const RELATION_CUES = [
  ['combines', /\b(we (use|adopt|employ|leverage|initiali[sz]e|take|explore|experiment with|train)|as the base architecture|(image|text|vision|language) encoder|initiali[sz]ed? (from|with)|pre-?trained .{0,40}from|frozen|backbone|off-the-shelf|following .{0,20}we use)\b/i],
  ['extends', /\b(follow(ing)?|based on|build(s|ing)? (up)?on|extend|inspired by|similar to|adapt|improve(s|d)? (up)?on|generali[sz]e)\b/i],
  ['challenges', /\b(unlike|in contrast|however|suffer|limitation|fail|drawback|expensive|costly|prohibitive)\b/i],
  ['simplifies', /\b(simpl(e|er|ify|ifies)|without (the need|requiring)|remove(s)? the need)\b/i],
  ['benchmarks-against', /\b(outperform|surpass|compared? (to|with)|baseline|better than|beats?)\b/i, /experiment|result|evaluation|ablation|comparison/i],
]

const SECTION_LOCATION = [
  ['method', /method|approach|model|architecture|pre-?train|framework|implementation|setup/i],
  ['related-work', /related|prior|previous/i],
  ['introduction', /introduction/i],
  ['experiments', /experiment|result|evaluation|ablation|analysis/i],
]

const year = (p) => Number(p.published?.slice(0, 4))
const shortName = (p) => {
  const name = overrides.shortNames[p.arxivId] ?? SHORT_NAMES[p.arxivId]
  if (name) return name
  const head = p.title.split(':')[0].trim()
  return head.length <= 28 && head !== p.title ? head : p.title.split(/\s+/).slice(0, 5).join(' ')
}
const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
const hasAlias = (text, c) => [c.name, ...c.aliases].some((a) => new RegExp(`\\b${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text))

// 1. Influence filter + reachability back to the root.
const isStrong = (e) => e.mentions >= 2 || e.methodMentions >= 1
const strong = graph.edges.filter(isStrong)
const reach = new Set([graph.root])
for (let changed = true; changed; ) {
  changed = false
  for (const e of strong) {
    if (overrides.exclude[e.cited]) continue
    if (reach.has(e.citing) && !reach.has(e.cited)) reach.add(e.cited), (changed = true)
  }
}
const papers = Object.values(graph.papers).filter((p) => reach.has(p.arxivId) && p.title)

// 3. Concepts per paper.
const conceptBySlug = new Map(concepts.map((c) => [c.slug, c]))
const paperConcepts = new Map()
for (const p of papers) {
  const text = `${p.title}. ${p.abstract ?? ''}`
  const introduces = concepts.filter((c) => c.introducedBy === p.arxivId).map((c) => c.slug)
  const uses = concepts.filter((c) => !introduces.includes(c.slug) && hasAlias(text, c)).map((c) => c.slug)
  paperConcepts.set(p.arxivId, {introduces, uses})
}

// 2 + 4. Edges with proposed relation, inherited concepts and evidence.
const keptIds = new Set(papers.map((p) => p.arxivId))
const byId = new Map(papers.map((p) => [p.arxivId, p]))
const influences = []
for (const e of strong) {
  if (!keptIds.has(e.citing) || !keptIds.has(e.cited)) continue
  const from = byId.get(e.cited), to = byId.get(e.citing) // lineage flows from the cited (older) paper
  if (year(from) > year(to)) continue // citation to a later version of an older idea; not lineage
  // A context only counts as evidence if it names the cited paper's first author; the harvester
  // falls back to a paragraph's first sentence when it can't place the citation label.
  const surname = firstAuthorSurname(e.bibText) ?? from.authors?.[0]?.split(' ').at(-1)
  const contexts = (e.contexts ?? []).filter((c) => !surname || c.text.includes(surname) || /\[\d/.test(c.text))
  const ranked = [...contexts].sort((a, b) => rankSection(a.section) - rankSection(b.section))
  let relation = kindOf(from.arxivId) === 'dataset' ? 'uses-dataset' : null, cue = null
  for (const c of relation ? [] : ranked) {
    const hit = RELATION_CUES.find(([, re, sectionRe]) => re.test(c.text) && (!sectionRe || sectionRe.test(c.section)))
    if (hit) {
      relation = hit[0], cue = c
      break
    }
  }
  const fromConcepts = paperConcepts.get(from.arxivId)
  const toConcepts = paperConcepts.get(to.arxivId)
  const contextText = contexts.map((c) => c.text).join(' ')
  const inherited = [...new Set([
    ...fromConcepts.introduces.filter((slug) => [...toConcepts.introduces, ...toConcepts.uses].includes(slug) || hasAlias(contextText, conceptBySlug.get(slug))),
    ...fromConcepts.uses.filter((slug) => hasAlias(contextText, conceptBySlug.get(slug))),
  ])].slice(0, 4)
  const evidence = cue ?? ranked[0]
  if (relation === 'uses-dataset') cue = evidence
  const confidence = Math.min(0.95, 0.25 + 0.08 * e.mentions + 0.12 * e.methodMentions + (cue ? 0.2 : 0) - (evidence ? 0 : 0.2))
  influences.push({
    _id: `influence.${from.arxivId}.${to.arxivId}`.replace(/\./g, '-'),
    from: from.arxivId,
    to: to.arxivId,
    relation, // null = no cue found; a curator picks it
    inherited,
    explanation: relation ? explain(relation, from, to, e, inherited) : null,
    evidence: evidence ? {quote: evidence.text, location: locationOf(evidence.section), section: evidence.section} : null,
    signals: {mentions: e.mentions, methodMentions: e.methodMentions, relatedMentions: e.relatedMentions, sections: e.sections},
    provenance: {origin: 'harvest', confidence: Number(confidence.toFixed(2)), reviewDecision: 'proposed'},
  })
}

function firstAuthorSurname(bib = '') {
  // LaTeXML bib text starts with the author block: "Li, J., Li, D., …" or "Junnan Li, Dongxu Li, …"
  const head = bib.split(/\s(?=\d{4}\b)|\.\s/)[0]
  return head.match(/^([A-Z][\w'’-]+),/)?.[1] ?? head.match(/^[A-Z][\w.'’-]*\s+([A-Z][\w'’-]+)/)?.[1]
}

function rankSection(section = '') {
  const i = SECTION_LOCATION.findIndex(([, re]) => re.test(section))
  return i < 0 ? SECTION_LOCATION.length : i
}
function locationOf(section = '') {
  return SECTION_LOCATION.find(([, re]) => re.test(section))?.[0] ?? 'other'
}
function explain(relation, from, to, e, inherited) {
  const verbs = {
    extends: 'builds on', combines: 'reuses components from', 'benchmarks-against': 'compares itself against',
    challenges: 'addresses limitations of', simplifies: 'simplifies', replaces: 'replaces', 'applies-to-new-domain': 'carries over',
    'uses-dataset': 'trains or evaluates on',
  }
  const what = inherited.length ? ` — carrying ${inherited.map((s) => conceptBySlug.get(s).name).join(', ')}` : ''
  const where = e.methodMentions ? `, citing it ${e.methodMentions}× in its method` : `, citing it ${e.mentions}×`
  return `${shortName(to)} ${verbs[relation]} ${shortName(from)}${what}${where}.`.slice(0, 280)
}

// Output in a CMS-agnostic shape; the seed script maps it onto Sanity documents.
const outPapers = papers
  .sort((a, b) => a.published.localeCompare(b.published))
  .map((p) => ({
    arxivId: p.arxivId,
    title: p.title,
    shortName: shortName(p),
    kind: kindOf(p.arxivId),
    slug: slugify(shortName(p)),
    publishedAt: p.published,
    authors: p.authors ?? [],
    abstract: p.abstract ?? '',
    primaryCategory: p.primaryCategory ?? null,
    comment: p.comment ?? null,
    depth: p.depth,
    fullTextSource: p.fullTextSource,
    ...paperConcepts.get(p.arxivId),
    stats: {
      ancestors: influences.filter((i) => i.to === p.arxivId).length,
      descendants: influences.filter((i) => i.from === p.arxivId).length,
    },
  }))

// Slugs must be unique.
const seen = new Map()
for (const p of outPapers) {
  const n = seen.get(p.slug) ?? 0
  seen.set(p.slug, n + 1)
  if (n) p.slug = `${p.slug}-${n + 1}`
}

await writeFile('data/curated/papers.json', JSON.stringify(outPapers, null, 2))
await writeFile('data/curated/influences.json', JSON.stringify(influences, null, 2))

const relCounts = Object.fromEntries(Object.entries(Object.groupBy(influences, (i) => i.relation ?? '(unlabelled)')).map(([k, v]) => [k, v.length]))
console.log(`papers: ${outPapers.length} (dropped ${Object.keys(graph.papers).length - outPapers.length}: excluded or unreachable)`, Object.fromEntries(Object.entries(Object.groupBy(outPapers, (p) => p.kind)).map(([k, v]) => [k, v.length])))
console.log(`influences: ${influences.length}`, relCounts)
console.log(`concepts used: ${new Set(outPapers.flatMap((p) => [...p.introduces, ...p.uses])).size}/${concepts.length}`)
