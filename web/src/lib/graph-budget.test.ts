// Run: node --test src/lib/*.test.ts  (uses the curated dataset in data/curated as a stand-in for the API)
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {test} from 'node:test'
import {budgetGraph, layout, linkStrength} from './graph-budget.ts'
import type {GraphLink, GraphPaper} from './sanity/types.ts'

const root = new URL('../../../data/curated/', import.meta.url)
const rawPapers = JSON.parse(readFileSync(new URL('papers.json', root), 'utf8')) as {arxivId: string; shortName: string; slug: string; publishedAt: string; kind: GraphPaper['kind']; title: string}[]
const rawLinks = JSON.parse(readFileSync(new URL('influences.json', root), 'utf8')) as {_id: string; from: string; to: string; signals: {mentions: number; methodMentions: number}}[]
const pid = (arxiv: string) => `paper-${arxiv.replace('.', '-')}`
const papers: GraphPaper[] = rawPapers.map((p) => ({_id: pid(p.arxivId), shortName: p.shortName, slug: p.slug, publishedAt: p.publishedAt, kind: p.kind, title: p.title}))
const links: GraphLink[] = rawLinks.map((l) => ({_id: l._id, from: pid(l.from), to: pid(l.to), mentions: l.signals.mentions, methodMentions: l.signals.methodMentions, decision: 'proposed', relation: null}))
const BLIP2 = pid('2301.12597')
const base = {focusId: BLIP2, depth: 2 as const, budget: 30, hideDatasets: true, verifiedOnly: false, simplify: true}

test('default BLIP-2 view respects the 30-paper budget and accounts for every hidden paper', () => {
  const r = budgetGraph(papers, links, base)
  assert.ok(r.total > 60, `expected a large neighbourhood, got ${r.total}`)
  assert.equal(r.nodes.length, 30)
  assert.equal(r.stacks.reduce((n, s) => n + s.count, 0), r.total - 30)
  assert.ok(r.nodes.some((n) => n._id === BLIP2 && n.generation === 0))
})

test('every direct ancestor is always shown, and no dataset when datasets are hidden', () => {
  const r = budgetGraph(papers, links, base)
  const direct = new Set(links.filter((l) => l.to === BLIP2).map((l) => l.from))
  const directNonDataset = [...direct].filter((id) => papers.find((p) => p._id === id)!.kind !== 'dataset')
  for (const id of directNonDataset) assert.ok(r.nodes.some((n) => n._id === id), `missing direct ancestor ${id}`)
  assert.ok(r.nodes.every((n) => n.kind !== 'dataset'))
  const withDatasets = budgetGraph(papers, links, {...base, hideDatasets: false})
  assert.ok(withDatasets.total > r.total)
})

test('verified links keep both ends visible even beyond the budget ranking', () => {
  const weakest = budgetGraph(papers, links, base).hiddenIds.at(-1)!
  const target = links.find((l) => l.from === weakest)!
  const accepted = links.map((l) => (l._id === target._id ? {...l, decision: 'accepted' as const, relation: 'extends' as const} : l))
  const r = budgetGraph(papers, accepted, base)
  assert.ok(r.nodes.some((n) => n._id === weakest))
})

test('verified-only shows nothing but the focus while no link is accepted', () => {
  const r = budgetGraph(papers, links, {...base, verifiedOnly: true})
  assert.equal(r.nodes.length, 1)
  assert.equal(r.edges.length, 0)
})

test('expanding a year stack reveals up to 8 more papers from that year', () => {
  const r = budgetGraph(papers, links, base)
  const stack = r.stacks.find((s) => s.count >= 8)!
  const expanded = budgetGraph(papers, links, {...base, expandedYears: new Set([stack.year])})
  assert.equal(expanded.nodes.length, 30 + 8)
  assert.equal(expanded.stacks.find((s) => s.year === stack.year)?.count ?? 0, stack.count - 8)
})

test('simplify removes A→C when A→B→C is drawn, and edges only join shown papers', () => {
  const plain = budgetGraph(papers, links, {...base, simplify: false})
  const simple = budgetGraph(papers, links, base)
  assert.ok(simple.edges.length < plain.edges.length)
  const shown = new Set(simple.nodes.map((n) => n._id))
  assert.ok(simple.edges.every((e) => shown.has(e.from) && shown.has(e.to)))
})

test('layout puts every node in its year column, without overlaps, and is deterministic', () => {
  const r = budgetGraph(papers, links, base)
  const a = layout(r)
  const b = layout(r)
  assert.deepEqual(a.placed.map((p) => [p._id, p.x, p.y]), b.placed.map((p) => [p._id, p.x, p.y]))
  for (const p of a.placed) assert.equal(p.x, a.colX.get(p.year))
  const keys = a.placed.map((p) => `${p.x}:${Math.round(p.y)}`)
  assert.equal(new Set(keys).size, keys.length, 'two nodes share a position')
  assert.equal(linkStrength({mentions: 2, methodMentions: 1}), 5)
})
