// Explorer node budget (DESIGN_SPEC §5.3, decision D6). Pure: unit-tested in graph-budget.test.ts.
import type {GraphLink, GraphPaper} from './sanity/types'

export type BudgetOptions = {
  focusId: string
  depth: 1 | 2 | 3
  budget: number
  hideDatasets: boolean
  verifiedOnly: boolean
  simplify: boolean
  expandedYears?: ReadonlySet<string>
  pinned?: ReadonlySet<string>
}

export type BudgetNode = GraphPaper & {generation: number; strength: number; year: string}
export type BudgetResult = {
  nodes: BudgetNode[]
  edges: GraphLink[]
  stacks: {year: string; count: number}[]
  total: number
  hiddenIds: string[]
}

export const linkStrength = (l: Pick<GraphLink, 'mentions' | 'methodMentions'>) => 3 * l.methodMentions + l.mentions
const verified = (l: GraphLink) => l.decision === 'accepted' && !!l.relation

export function budgetGraph(papers: GraphPaper[], links: GraphLink[], o: BudgetOptions): BudgetResult {
  const byId = new Map(papers.map((p) => [p._id, p]))
  const allowed = (id: string) => {
    const p = byId.get(id)
    return !!p && !(o.hideDatasets && p.kind === 'dataset')
  }
  const usable = links.filter((l) => l.decision !== 'rejected' && (!o.verifiedOnly || verified(l)) && allowed(l.from) && allowed(l.to))
  const incoming = new Map<string, GraphLink[]>()
  for (const l of usable) incoming.set(l.to, [...(incoming.get(l.to) ?? []), l])

  // Generations back from the focus, with each paper's strongest connection to a nearer generation.
  const generation = new Map<string, number>([[o.focusId, 0]])
  const strength = new Map<string, number>([[o.focusId, Infinity]])
  let frontier = [o.focusId]
  for (let g = 1; g <= o.depth && frontier.length; g++) {
    const next: string[] = []
    for (const child of frontier) {
      for (const l of incoming.get(child) ?? []) {
        if (!generation.has(l.from)) {
          generation.set(l.from, g)
          next.push(l.from)
        }
        if (generation.get(l.from) === g) strength.set(l.from, Math.max(strength.get(l.from) ?? 0, linkStrength(l)))
      }
    }
    frontier = next
  }

  const candidates = [...generation.keys()]
  const year = (id: string) => byId.get(id)!.publishedAt.slice(0, 4)
  const descendants = (id: string) => usable.filter((l) => l.from === id).length

  const keep = new Set<string>([o.focusId])
  for (const id of candidates) if (generation.get(id) === 1) keep.add(id)
  for (const l of usable) {
    if (verified(l) && generation.has(l.from) && generation.has(l.to)) keep.add(l.from).add(l.to)
  }
  for (const id of o.pinned ?? []) if (generation.has(id)) keep.add(id)

  const ranked = candidates
    .filter((id) => !keep.has(id))
    .sort((a, b) => (strength.get(b) ?? 0) - (strength.get(a) ?? 0) || year(b).localeCompare(year(a)) || descendants(b) - descendants(a))
  for (const id of ranked) {
    if (keep.size >= o.budget) break
    keep.add(id)
  }
  // An expanded year stack reveals up to 8 more papers from that year, beyond the budget.
  for (const y of o.expandedYears ?? []) {
    ranked.filter((id) => !keep.has(id) && year(id) === y).slice(0, 8).forEach((id) => keep.add(id))
  }

  const hidden = candidates.filter((id) => !keep.has(id))
  const stackCounts = new Map<string, number>()
  for (const id of hidden) stackCounts.set(year(id), (stackCounts.get(year(id)) ?? 0) + 1)

  let edges = usable.filter((l) => keep.has(l.from) && keep.has(l.to))
  if (o.simplify) {
    // Transitive reduction: hide A→C when A→B→C is drawn, unless A→C itself is verified.
    const out = new Map<string, Set<string>>()
    for (const e of edges) out.set(e.from, (out.get(e.from) ?? new Set()).add(e.to))
    edges = edges.filter((e) => {
      if (verified(e)) return true
      for (const mid of out.get(e.from) ?? []) if (mid !== e.to && out.get(mid)?.has(e.to)) return false
      return true
    })
  }

  return {
    nodes: [...keep].map((id) => ({...byId.get(id)!, generation: generation.get(id)!, strength: strength.get(id) ?? 0, year: year(id)})),
    edges,
    stacks: [...stackCounts].map(([year, count]) => ({year, count})).sort((a, b) => a.year.localeCompare(b.year)),
    total: candidates.length,
    hiddenIds: hidden,
  }
}

export type Placed = BudgetNode & {x: number; y: number}

/**
 * Year columns left→right; within a column, order by the average height of the papers each node feeds
 * (barycentre, placed from newest to oldest) so links cross less. Deterministic and cheap: no layout engine.
 */
export function layout(result: BudgetResult, dims = {colW: 136, rowH: 60, top: 56, left: 70}) {
  const years = [...new Set([...result.nodes.map((n) => n.year), ...result.stacks.map((s) => s.year)])].sort()
  const colX = new Map(years.map((y, i) => [y, dims.left + i * dims.colW]))
  const columns = new Map<string, BudgetNode[]>()
  for (const n of result.nodes) columns.set(n.year, [...(columns.get(n.year) ?? []), n])

  const yOf = new Map<string, number>()
  const tallest = Math.max(1, ...[...columns.values()].map((c) => c.length + (result.stacks.some((s) => columns.get(s.year) === c) ? 1 : 0)))
  const height = dims.top + tallest * dims.rowH + 40
  for (const y of [...years].reverse()) {
    const col = columns.get(y) ?? []
    const score = (n: BudgetNode) => {
      const targets = result.edges.filter((e) => e.from === n._id && yOf.has(e.to)).map((e) => yOf.get(e.to)!)
      return targets.length ? targets.reduce((a, b) => a + b, 0) / targets.length : Number.POSITIVE_INFINITY - n.strength
    }
    col.sort((a, b) => score(a) - score(b) || b.strength - a.strength)
    const blockH = col.length * dims.rowH
    const start = Math.max(dims.top, (height - 40 + dims.top) / 2 - blockH / 2)
    col.forEach((n, i) => yOf.set(n._id, start + i * dims.rowH + dims.rowH / 2))
  }
  const placed: Placed[] = result.nodes.map((n) => ({...n, x: colX.get(n.year)!, y: yOf.get(n._id)!}))
  const stacks = result.stacks.map((s) => {
    const inCol = placed.filter((p) => p.year === s.year)
    // A year with no visible paper keeps its stack mid-height, so the canvas doesn't grow downwards.
    const y = inCol.length ? Math.max(...inCol.map((p) => p.y)) + dims.rowH : (height - 40 + dims.top) / 2
    return {...s, x: colX.get(s.year)!, y}
  })
  const finalHeight = Math.max(height, ...stacks.map((s) => s.y + dims.rowH))
  return {placed, stacks, years, colX, width: dims.left * 2 + (years.length - 1) * dims.colW, height: finalHeight}
}
