#!/usr/bin/env node
// Builds data/seed/production.ndjson from the curated dataset, ready for
//   cd studio && npx sanity dataset import ../data/seed/production.ndjson production --replace
//
// Documents:
//   paper-<arxiv>            published paper metadata (+ concepts it uses)
//   paperText.<arxiv>        full text by section; dot-path id = not readable by public queries
//   influence-<from>-<to>    citation facts (all sentences, keyed) + proposed interpretation
//   concept-<slug>           25 themes and 180 concepts
//   datasetStats, siteSettings singletons

import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import {parse} from 'node-html-parser'
import {mergeEdges} from './lib/edges.mjs'

const CUR = 'data/curated'
const papers = JSON.parse(readFileSync(`${CUR}/papers.json`, 'utf8'))
const influences = JSON.parse(readFileSync(`${CUR}/influences.json`, 'utf8'))
const concepts = JSON.parse(readFileSync(`${CUR}/concepts.json`, 'utf8'))
const buildsOn = JSON.parse(readFileSync(`${CUR}/concept-buildson.json`, 'utf8'))
const graph = JSON.parse(readFileSync('data/raw/graph.json', 'utf8'))

const idOf = (arxivId) => arxivId.replace('.', '-')
const paperId = (arxivId) => `paper-${idOf(arxivId)}`
const conceptId = (slug) => `concept-${slug}`
const ref = (_ref, key) => ({_type: 'reference', _ref, ...(key ? {_key: key} : {})})
const now = new Date().toISOString()

// ar5iv renders math as LaTeX alt-text inside sentences ("BERTbase{}_{\text{base}}"). Strip it.
const cleanTex = (s = '') =>
  s
    .replace(/\{\}_\{[^{}]*(\{[^{}]*\})?[^{}]*\}/g, '')
    .replace(/\\(?:text|mathrm|mathbf|textbf|emph|mathcal)\{([^{}]*)\}/g, '$1')
    .replace(/\{\}/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const docs = []

// ---------------------------------------------------------------- concepts
for (const c of concepts) {
  docs.push({
    _id: conceptId(c.slug),
    _type: 'concept',
    name: c.name,
    slug: {_type: 'slug', current: c.slug},
    level: c.level === 'theme' ? 'theme' : 'concept',
    ...(c.broader ? {broader: ref(conceptId(c.broader))} : {}),
    category: c.category,
    summary: c.summary,
    ...(c.aliases?.length ? {aliases: c.aliases} : {}),
    ...(c.introducedBy ? {introducedBy: ref(paperId(c.introducedBy))} : {}),
    ...(buildsOn[c.slug] ? {buildsOn: buildsOn[c.slug].map((slug, k) => ref(conceptId(slug), `b${k}`))} : {}),
    origin: 'ai',
  })
}

// ---------------------------------------------------------------- papers + full text
const refsParsed = new Map()
for (const e of graph.edges) refsParsed.set(e.citing, (refsParsed.get(e.citing) ?? 0) + 1)

function fullTextSections(arxivId) {
  const html = `data/raw/html/${arxivId}.html`
  if (existsSync(html) && readFileSync(html, 'utf8')) {
    const doc = parse(readFileSync(html, 'utf8'))
    return doc.querySelectorAll('section.ltx_section').map((s, i) => ({
      _key: `s${i}`,
      _type: 'section',
      heading: s.querySelector('h2')?.text.replace(/\s+/g, ' ').trim() ?? '',
      text: cleanTex(s.querySelectorAll('p.ltx_p').map((p) => p.text).join('\n\n')).slice(0, 20_000),
    }))
  }
  const pdf = `data/raw/pdf/${arxivId}.txt`
  if (existsSync(pdf) && readFileSync(pdf, 'utf8')) {
    return [{_key: 's0', _type: 'section', heading: 'Full text (from PDF)', text: readFileSync(pdf, 'utf8').replace(/\s+/g, ' ').slice(0, 60_000)}]
  }
  return []
}

for (const p of papers) {
  docs.push({
    _id: paperId(p.arxivId),
    _type: 'paper',
    title: p.title,
    shortName: p.shortName.slice(0, 40),
    slug: {_type: 'slug', current: p.slug},
    kind: p.kind,
    arxivId: p.arxivId,
    publishedAt: p.publishedAt,
    authors: p.authors,
    primaryCategory: p.primaryCategory ?? undefined,
    abstract: p.abstract,
    uses: p.uses.map((slug, i) => ref(conceptId(slug), `u${i}`)),
    harvest: {
      origin: 'harvest',
      depth: p.depth,
      fullTextSource: p.fullTextSource ?? undefined,
      referenceCount: refsParsed.get(p.arxivId) ?? 0,
      harvestedAt: now,
    },
  })
  const sections = fullTextSections(p.arxivId)
  if (sections.length) {
    docs.push({_id: `paperText.${idOf(p.arxivId)}`, _type: 'paperText', paper: ref(paperId(p.arxivId)), source: p.fullTextSource ?? 'html', sections})
  }
}

// ---------------------------------------------------------------- influences
const rawEdge = new Map(mergeEdges(graph.edges).map((e) => [`${e.cited}>${e.citing}`, e]))
for (const i of influences) {
  const raw = rawEdge.get(`${i.from}>${i.to}`)
  const contexts = (raw?.contexts ?? []).map((c, k) => ({_key: `c${k}`, _type: 'citationContext', section: c.section, text: cleanTex(c.text)}))
  const evidence = i.evidence ? contexts.find((c) => c.text === cleanTex(i.evidence.quote)) : undefined
  docs.push({
    _id: i._id,
    _type: 'influence',
    from: ref(paperId(i.from)),
    to: ref(paperId(i.to)),
    citation: {
      mentions: i.signals.mentions,
      methodMentions: i.signals.methodMentions,
      relatedMentions: i.signals.relatedMentions,
      sections: i.signals.sections,
      contexts,
    },
    ...(evidence ? {evidenceKey: evidence._key} : {}),
    // Interpretation is only a proposal until review; public queries hide it unless accepted.
    ...(i.relation ? {relation: i.relation} : {}),
    inherited: i.inherited.map((slug, k) => ref(conceptId(slug), `i${k}`)),
    ...(i.explanation ? {explanation: i.explanation} : {}),
    provenance: {
      origin: 'harvest',
      ...(i.relation ? {suggestedRelation: i.relation} : {}),
      confidence: i.provenance.confidence,
      reviewDecision: 'proposed',
    },
  })
}

// ---------------------------------------------------------------- singletons
const descendants = new Map()
for (const i of influences) descendants.set(i.from, (descendants.get(i.from) ?? 0) + 1)
docs.push({
  _id: 'datasetStats',
  _type: 'datasetStats',
  papers: papers.length,
  links: influences.length,
  linksAccepted: 0,
  linksRejected: 0,
  concepts: concepts.filter((c) => c.level !== 'theme').length,
  themes: concepts.filter((c) => c.level === 'theme').length,
  mostInfluential: [...descendants.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([arxivId, n], k) => ({_key: `r${k}`, _type: 'ranked', paper: {_type: 'reference', _ref: paperId(arxivId), _weak: true}, descendants: n})),
  updatedAt: now,
})
const byName = Object.fromEntries(papers.map((p) => [p.shortName, p.arxivId]))
docs.push({
  _id: 'siteSettings',
  _type: 'siteSettings',
  heroTitle: 'Every idea has ancestors.',
  heroDek: 'Ask where an idea came from, what a paper built on, or how two papers are connected. Every answer links to the papers and quotes behind it.',
  examplePrompts: [
    'Where did BLIP-2’s Q-Former come from?',
    'How is ResNet connected to CLIP?',
    'What did ALBEF change about vision-language pre-training?',
    'Which papers kept the language model frozen?',
    'Compare Flamingo and BLIP-2',
    'What came before masked image modelling?',
  ],
  startPapers: ['BERT', 'Transformer', 'ResNet', 'GPT-3', 'ViT', 'CLIP'].map((n, k) => ref(paperId(byName[n]), `p${k}`)),
})

// ---------------------------------------------------------------- integrity + write
const ids = new Set(docs.map((d) => d._id))
const dangling = []
JSON.stringify(docs, (k, v) => {
  if (v && typeof v === 'object' && v._type === 'reference' && !v._weak && !ids.has(v._ref)) dangling.push(v._ref)
  return v
})
if (dangling.length) {
  console.error(`Dangling references: ${[...new Set(dangling)].slice(0, 10).join(', ')}`)
  process.exit(1)
}
mkdirSync('data/seed', {recursive: true})
writeFileSync('data/seed/production.ndjson', docs.map((d) => JSON.stringify(d)).join('\n') + '\n')
const count = Object.groupBy(docs, (d) => d._type)
console.log(Object.fromEntries(Object.entries(count).map(([k, v]) => [k, v.length])), `→ data/seed/production.ndjson`)
console.log('evidence keyed:', docs.filter((d) => d._type === 'influence' && d.evidenceKey).length, '/', influences.length)
