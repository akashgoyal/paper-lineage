'use client'

import Link from 'next/link'
import {usePathname, useRouter, useSearchParams} from 'next/navigation'
import {useEffect, useMemo, useRef, useState} from 'react'
import {QuoteBlock, RelationChip, StatTile} from '@/components/ui'
import {RELATION_COLOR, RELATION_LABEL, year} from '@/lib/format'
import {budgetGraph, layout, linkStrength, type Placed} from '@/lib/graph-budget'
import {LINK_QUERY} from '@/lib/sanity/queries'
import {useClientQuery} from '@/lib/sanity/useClientQuery'
import type {GraphLink, GraphPaper, LinkFields, Relation} from '@/lib/sanity/types'

const NW = 104
const NH = 44
const DEFAULT_FOCUS = 'blip-2'

type FullLink = LinkFields & {from: {shortName: string; slug: string}; to: {shortName: string; slug: string}}

function useParamState() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k)
      else next.set(k, v)
    }
    router.replace(`${pathname}?${next.toString()}`, {scroll: false})
  }
  return {params, set}
}

const edgePath = (a: Placed, b: Placed) => {
  const x1 = a.x + NW / 2
  const x2 = b.x - NW / 2
  const dx = Math.max(40, (x2 - x1) * 0.5)
  return `M ${x1} ${a.y} C ${x1 + dx} ${a.y}, ${x2 - dx} ${b.y}, ${x2} ${b.y}`
}

export function Explorer({papers, links}: {papers: GraphPaper[]; links: GraphLink[]}) {
  const {params, set} = useParamState()
  const bySlug = useMemo(() => new Map(papers.map((p) => [p.slug, p])), [papers])
  const byId = useMemo(() => new Map(papers.map((p) => [p._id, p])), [papers])
  const focus = bySlug.get(params.get('focus') ?? DEFAULT_FOCUS) ?? bySlug.get(DEFAULT_FOCUS)!
  const depth = (Number(params.get('depth')) || 2) as 1 | 2 | 3
  const verifiedOnly = params.get('verified') === '1'
  const hideDatasets = params.get('datasets') !== '1'
  const simplify = params.get('simplify') !== '0'
  const showAll = params.get('all') === '1'
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set())
  const [pinned, setPinned] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<{kind: 'paper'; id: string} | {kind: 'link'; id: string} | null>(null)
  const [budget, setBudget] = useState(30)
  const [hovered, setHovered] = useState<string | null>(null)
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1279px)')
    const apply = () => setBudget(mq.matches ? 18 : 30)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])
  // A new focus or depth starts a fresh view (adjusting state while rendering, not in an effect).
  const view = `${focus._id}:${depth}`
  const [lastView, setLastView] = useState(view)
  if (view !== lastView) {
    setLastView(view)
    setExpandedYears(new Set())
    setSelected(null)
  }

  const result = useMemo(
    () => budgetGraph(papers, links, {focusId: focus._id, depth, budget, hideDatasets, verifiedOnly, simplify, expandedYears, pinned}),
    [papers, links, focus._id, depth, budget, hideDatasets, verifiedOnly, simplify, expandedYears, pinned],
  )
  const geo = useMemo(() => layout(result), [result])
  const placedById = useMemo(() => new Map(geo.placed.map((p) => [p._id, p])), [geo])

  const selectedLink = selected?.kind === 'link' ? result.edges.find((e) => e._id === selected.id) : undefined
  const selectedPaper = selected?.kind === 'paper' ? byId.get(selected.id) : undefined

  // Emphasis: the selected paper (or link) and its neighbourhood stand out, everything else dims.
  // Hover previews the same, lighter, while nothing is selected.
  const emphasis = useMemo(() => {
    const paperId = selected?.kind === 'paper' ? selected.id : selected ? null : hovered
    if (selectedLink) return {nodes: new Set([selectedLink.from, selectedLink.to]), edges: new Set([selectedLink._id]), strong: true}
    if (!paperId) return null
    const edges = result.edges.filter((e) => e.from === paperId || e.to === paperId)
    return {nodes: new Set([paperId, ...edges.flatMap((e) => [e.from, e.to])]), edges: new Set(edges.map((e) => e._id)), strong: Boolean(selected)}
  }, [selected, selectedLink, hovered, result.edges])

  // The focus paper is the newest column: open the graph scrolled to it, not to the oldest year.
  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [focus._id, depth, geo.width])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSelected(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <main className="mx-auto max-w-[1440px] px-4 pb-10 pt-6 md:px-8">
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div className="min-w-0 flex-1">
          <div className="overline mb-1">Lineage of</div>
          <h1 className="m-0 font-serif text-3xl font-medium tracking-tight md:text-[38px]">
            <Link href={`/paper/${focus.slug}`} className="text-ink no-underline">
              {focus.shortName}
            </Link>{' '}
            <span className="text-2xl text-muted">{year(focus.publishedAt)}</span>
          </h1>
        </div>
        <div role="group" aria-label="Generations back" className="flex items-center gap-2 text-[13px] text-ink-2">
          Generations back
          <div className="flex overflow-hidden rounded-lg border border-line-strong">
            {[1, 2, 3].map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={d === depth}
                onClick={() => set({depth: String(d)})}
                className={`h-[34px] w-10 border-l border-line-strong text-[13px] first:border-l-0 ${d === depth ? 'bg-ink text-white' : 'bg-surface text-ink'}`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            {label: 'Verified only', checked: verifiedOnly, on: () => set({verified: verifiedOnly ? null : '1'})},
            {label: 'Hide datasets', checked: hideDatasets, on: () => set({datasets: hideDatasets ? '1' : null})},
            {label: 'Simplify', checked: simplify, on: () => set({simplify: simplify ? '0' : null})},
          ].map((t) => (
            <label key={t.label} className="flex h-[34px] items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 text-[13px]">
              <input type="checkbox" checked={t.checked} onChange={t.on} /> {t.label}
            </label>
          ))}
        </div>
        <div className="text-[13px] text-ink-2" aria-live="polite">
          Showing {result.nodes.length} of {result.total} ·{' '}
          <button type="button" className="text-[var(--rel-extends)] underline" onClick={() => set({all: showAll ? null : '1'})}>
            {showAll ? 'Back to graph' : `Show all ${result.total}`}
          </button>
        </div>
      </div>

      {showAll ? (
        <TableView papers={papers} links={links} focusId={focus._id} result={result} onFocus={(slug) => set({focus: slug, all: null})} />
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section aria-label="Lineage graph" className="hidden overflow-hidden rounded-xl border border-line bg-surface sm:block">
            {result.nodes.length === 1 ? (
              <p className="m-0 p-8 text-sm text-ink-2">
                {verifiedOnly ? 'No verified links lead to this paper yet. Turn off “Verified only” to see what it cites.' : `${focus.shortName} has no earlier papers in this dataset.`}
              </p>
            ) : (
              <div ref={scroller} className="overflow-x-auto">
                <div
                  className="relative"
                  style={{width: geo.width, height: geo.height}}
                  onClick={(e) => e.target === e.currentTarget && setSelected(null)}
                >
                  {geo.years.map((y) => (
                    <div key={y} aria-hidden>
                      <div className="tabular absolute top-3.5 w-20 -translate-x-1/2 text-center font-mono text-xs text-muted" style={{left: geo.colX.get(y)}}>
                        {y}
                      </div>
                      <div className="absolute top-10 border-l border-dashed border-line" style={{left: geo.colX.get(y), height: geo.height - 50}} />
                    </div>
                  ))}
                  <svg width={geo.width} height={geo.height} className="pointer-events-none absolute inset-0" aria-hidden>
                    {result.edges.map((e) => {
                      const a = placedById.get(e.from)
                      const b = placedById.get(e.to)
                      if (!a || !b || a.x === b.x) return null
                      const lit = emphasis?.edges.has(e._id)
                      const dim = emphasis && !lit
                      const ver = e.decision === 'accepted' && e.relation
                      const d = edgePath(a, b)
                      return (
                        <g key={e._id} className="pointer-events-auto cursor-pointer" onClick={() => setSelected({kind: 'link', id: e._id})}>
                          {/* wide invisible stroke: a 1px dotted line is too thin to click */}
                          <path d={d} fill="none" stroke="transparent" strokeWidth={12} style={{pointerEvents: 'stroke'}} />
                          <path
                            d={d}
                            fill="none"
                            stroke={lit ? 'var(--select)' : ver ? RELATION_COLOR[e.relation as Relation] : 'var(--unreviewed)'}
                            strokeWidth={lit ? 2.5 : ver ? 2 : 1.25}
                            strokeDasharray={ver ? undefined : lit ? '3 4' : '2 4'}
                            strokeLinecap="round"
                            opacity={dim ? (emphasis?.strong ? 0.12 : 0.3) : 1}
                            style={{transition: 'opacity 150ms, stroke 150ms'}}
                          />
                        </g>
                      )
                    })}
                  </svg>
                  {geo.placed.map((n) => {
                    const isFocus = n._id === focus._id
                    const isSel = selected?.kind === 'paper' && selected.id === n._id
                    const isEnd = Boolean(selectedLink && (selectedLink.from === n._id || selectedLink.to === n._id))
                    const near = emphasis?.nodes.has(n._id)
                    const dim = emphasis && !near && !isFocus
                    const accent = isSel || isEnd
                    return (
                      <button
                        key={n._id}
                        type="button"
                        title={`${n.shortName} (${n.year}) · ${n.title}`}
                        aria-pressed={isSel}
                        onClick={() => setSelected(isSel ? null : {kind: 'paper', id: n._id})}
                        onDoubleClick={() => set({focus: n.slug})}
                        onMouseEnter={() => setHovered(n._id)}
                        onMouseLeave={() => setHovered((h) => (h === n._id ? null : h))}
                        onFocus={() => setHovered(n._id)}
                        onBlur={() => setHovered((h) => (h === n._id ? null : h))}
                        className={`absolute flex flex-col justify-center rounded-lg px-2.5 text-left transition-[opacity,box-shadow,background-color] duration-150 ${
                          isFocus
                            ? 'bg-ink text-white shadow-[0_4px_14px_rgb(23_25_30/.25)]'
                            : accent
                              ? 'bg-select-bg text-ink'
                              : near
                                ? 'bg-surface text-ink shadow-[0_2px_8px_rgb(124_58_237/.15)]'
                                : 'bg-surface text-ink shadow-[0_1px_2px_rgb(23_25_30/.06)]'
                        } ${
                          accent
                            ? 'border-2 border-select shadow-[0_0_0_4px_rgb(124_58_237/.18)]'
                            : near && emphasis?.strong
                              ? 'border border-select/60'
                              : `border ${n.kind === 'dataset' ? 'border-dashed' : ''} border-line-strong`
                        } ${dim ? (emphasis?.strong ? 'opacity-35' : 'opacity-60') : ''}`}
                        style={{left: n.x - NW / 2, top: n.y - NH / 2, width: NW, height: NH}}
                      >
                        <span className="truncate text-[13px] font-semibold">{n.shortName}</span>
                        <span className={`truncate whitespace-nowrap font-mono text-[10.5px] ${isFocus ? 'text-[#C9CCD3]' : 'text-muted'}`}>
                          {n.year}
                          {n.kind !== 'method' ? ` · ${n.kind}` : ''}
                          {pinned.has(n._id) ? ' · pinned' : ''}
                        </span>
                      </button>
                    )
                  })}
                  {geo.stacks.map((s) => (
                    <button
                      key={s.year}
                      type="button"
                      onClick={() => (s.count > 8 && expandedYears.has(s.year) ? set({all: '1'}) : setExpandedYears(new Set([...expandedYears, s.year])))}
                      className="absolute flex flex-col items-center justify-center rounded-lg border-[1.5px] border-dashed border-line-strong bg-ground text-[13px] text-ink-2"
                      style={{left: s.x - NW / 2, top: s.y - NH / 2, width: NW, height: NH}}
                      aria-label={`Show ${Math.min(8, s.count)} more papers from ${s.year}`}
                    >
                      <span className="font-semibold">+{s.count} more</span>
                      <span className="font-mono text-[10.5px] text-muted">{s.year}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <Legend />
          </section>

          <MobileList focus={focus} result={result} />

          <aside aria-label="Inspector" className="flex flex-col gap-4">
            {selectedLink ? (
              <LinkInspector link={selectedLink} from={byId.get(selectedLink.from)!} to={byId.get(selectedLink.to)!} />
            ) : selectedPaper ? (
              <PaperInspector
                paper={selectedPaper}
                links={links}
                isFocus={selectedPaper._id === focus._id}
                pinned={pinned.has(selectedPaper._id)}
                onPin={() => setPinned(new Set(pinned.has(selectedPaper._id) ? [...pinned].filter((p) => p !== selectedPaper._id) : [...pinned, selectedPaper._id]))}
                onFocus={() => set({focus: selectedPaper.slug})}
              />
            ) : (
              <div className="rounded-xl border border-line bg-surface p-5 text-sm leading-relaxed text-ink-2">
                Select a paper or a link to see its evidence. Double-click a paper to trace its own lineage.
              </div>
            )}
            <details className="rounded-xl border border-line bg-surface px-4 py-3">
              <summary className="cursor-pointer text-sm font-medium">Links in view ({result.edges.length})</summary>
              <ul className="m-0 mt-2 flex max-h-72 list-none flex-col gap-1 overflow-auto p-0">
                {result.edges.map((e) => (
                  <li key={e._id}>
                    <button
                      type="button"
                      aria-current={selected?.kind === 'link' && selected.id === e._id ? 'true' : undefined}
                      ref={(el) => {
                        if (el && selected?.kind === 'link' && selected.id === e._id) el.scrollIntoView({block: 'nearest'})
                      }}
                      onClick={() => setSelected({kind: 'link', id: e._id})}
                      className={`w-full rounded px-1.5 py-1 text-left text-[13px] ${selected?.kind === 'link' && selected.id === e._id ? 'bg-select-bg font-medium text-ink ring-1 ring-select/40' : 'hover:bg-ground'}`}
                    >
                      {byId.get(e.from)?.shortName} → {byId.get(e.to)?.shortName}{' '}
                      <span className="text-muted">{e.decision === 'accepted' && e.relation ? RELATION_LABEL[e.relation] : `cites ${e.mentions}×`}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          </aside>
        </div>
      )}
    </main>
  )
}

function Legend() {
  const rels: Relation[] = ['extends', 'combines', 'challenges', 'benchmarks-against']
  return (
    <div className="flex flex-wrap gap-4 border-t border-line px-4 py-3">
      {rels.map((r) => (
        <RelationChip key={r} relation={r} decision="accepted" />
      ))}
      <RelationChip relation={null} />
      <span className="ml-auto flex items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-3 w-5 rounded-sm bg-ink" /> Focus paper
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-3 w-5 rounded-sm border-2 border-select bg-select-bg" /> Selected · Esc clears
        </span>
      </span>
    </div>
  )
}

function LinkInspector({link, from, to}: {link: GraphLink; from: GraphPaper; to: GraphPaper}) {
  // undefined = loading, null = the read failed (shown, not an endless skeleton)
  const full = useClientQuery<FullLink | null>(LINK_QUERY, {id: link._id}, link._id)
  const verified = link.decision === 'accepted' && link.relation
  return (
    <div className="flex flex-col gap-3.5 rounded-xl border-2 border-select/50 bg-surface p-5">
      <div className="overline flex items-center gap-1.5 text-select">
        <span aria-hidden className="h-2 w-2 rounded-full bg-select" /> Selected link
      </div>
      <div className="font-serif text-2xl font-medium">
        {from.shortName} <span className="text-muted">→</span> {to.shortName}
      </div>
      <RelationChip relation={link.relation} decision={link.decision} />
      <div className="grid grid-cols-2 gap-2.5">
        <StatTile value={`${link.mentions}×`} label={`cited by ${to.shortName}`} />
        <StatTile value={link.methodMentions} label="in its Method section" />
      </div>
      <div className="min-h-[88px]">
        {full === undefined ? (
          <div aria-hidden className="h-[88px] animate-pulse rounded-lg bg-line" />
        ) : full === null ? (
          <p className="m-0 rounded-lg bg-ground px-4 py-3 text-[13px] text-ink-2">The citing sentence couldn’t be loaded. Open {to.shortName} to read it.</p>
        ) : (
          <QuoteBlock text={full.evidence?.text} source={`${to.shortName} · §${full.evidence?.section || 'unknown section'}`} />
        )}
      </div>
      {verified && full?.explanation && <p className="m-0 text-sm text-ink-2">{full.explanation}</p>}
      {!verified && (
        <p className="m-0 text-[13px] leading-normal text-ink-2">
          No curator has reviewed this link yet, so it shows only what the paper says. The relation type appears once someone verifies it.
        </p>
      )}
      <div className="flex gap-2">
        <Link href={`/paper/${from.slug}`} className="flex-1 rounded-lg bg-ink px-3 py-2 text-center text-[13px] font-medium text-white no-underline">
          Open {from.shortName}
        </Link>
        <Link href={`/paper/${to.slug}`} className="flex-1 rounded-lg border border-line-strong px-3 py-2 text-center text-[13px] text-ink no-underline">
          Open {to.shortName}
        </Link>
      </div>
    </div>
  )
}

function PaperInspector(props: {paper: GraphPaper; links: GraphLink[]; isFocus: boolean; pinned: boolean; onPin: () => void; onFocus: () => void}) {
  const {paper, links} = props
  const builtOn = links.filter((l) => l.to === paper._id && l.decision !== 'rejected').length
  const builtOnIt = links.filter((l) => l.from === paper._id && l.decision !== 'rejected').length
  return (
    <div className="flex flex-col gap-3 rounded-xl border-2 border-select/50 bg-surface p-5">
      <div className="overline flex items-center gap-1.5 text-select">
        <span aria-hidden className="h-2 w-2 rounded-full bg-select" /> Selected {paper.kind === 'method' ? 'paper' : paper.kind}
      </div>
      <div className="font-serif text-2xl font-medium leading-tight">{paper.shortName}</div>
      <div className="text-sm text-ink-2">{paper.title}</div>
      <div className="grid grid-cols-2 gap-2.5">
        <StatTile value={builtOn} label="papers it built on" />
        <StatTile value={builtOnIt} label="papers built on it" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={`/paper/${paper.slug}`} className="rounded-lg bg-ink px-3 py-2 text-[13px] font-medium text-white no-underline">
          Open paper
        </Link>
        {!props.isFocus && (
          <button type="button" onClick={props.onFocus} className="rounded-lg border border-line-strong px-3 py-2 text-[13px]">
            Refocus here
          </button>
        )}
        <button type="button" onClick={props.onPin} aria-pressed={props.pinned} className="rounded-lg border border-line-strong px-3 py-2 text-[13px]">
          {props.pinned ? 'Unpin' : 'Pin'}
        </button>
      </div>
    </div>
  )
}

// < 640 px: list mode grouped by generation (DESIGN_SPEC §8, board 8).
function MobileList({focus, result}: {focus: GraphPaper; result: ReturnType<typeof budgetGraph>}) {
  const gens = [1, 2, 3].map((g) => result.nodes.filter((n) => n.generation === g).sort((a, b) => b.strength - a.strength)).filter((g) => g.length)
  return (
    <section aria-label="Built on, by generation" className="sm:hidden">
      {gens.map((nodes, i) => (
        <div key={i} className="mb-4">
          <h2 className="overline m-0 mb-1">{i === 0 ? `Built on · ${nodes.length}` : `${i + 1} generations back · ${nodes.length}`}</h2>
          <ul className="m-0 list-none p-0">
            {nodes.map((n) => {
              const link = result.edges.find((e) => e.from === n._id && (i === 0 ? e.to === focus._id : true))
              return (
                <li key={n._id} className="flex flex-col gap-1 border-t border-line py-3">
                  <span className="flex items-center gap-2">
                    <Link href={`/paper/${n.slug}`} className="text-base font-semibold text-ink no-underline">
                      {n.shortName}
                    </Link>
                    <span className="font-mono text-[11.5px] text-muted">
                      {n.year}
                      {link ? ` · ${link.mentions}×` : ''}
                    </span>
                  </span>
                  {link && <RelationChip relation={link.relation} decision={link.decision} />}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
      {result.stacks.length > 0 && <p className="text-sm text-ink-2">{result.total - result.nodes.length} more papers further back. Use “Show all” to list them.</p>}
    </section>
  )
}

function TableView(props: {papers: GraphPaper[]; links: GraphLink[]; focusId: string; result: ReturnType<typeof budgetGraph>; onFocus: (slug: string) => void}) {
  const {result, links, focusId} = props
  const [sort, setSort] = useState<'strength' | 'year' | 'generation'>('strength')
  const all = budgetGraph(props.papers, links, {focusId, depth: 3, budget: 10_000, hideDatasets: false, verifiedOnly: false, simplify: false})
  const inView = new Set(result.nodes.map((n) => n._id).concat(result.hiddenIds))
  const rows = all.nodes
    .filter((n) => n._id !== focusId && inView.has(n._id))
    .map((n) => {
      const strongest = links.filter((l) => l.from === n._id && (l.to === focusId || inView.has(l.to))).sort((a, b) => linkStrength(b) - linkStrength(a))[0]
      return {n, strongest}
    })
    .sort((a, b) => (sort === 'year' ? a.n.year.localeCompare(b.n.year) : sort === 'generation' ? a.n.generation - b.n.generation : b.n.strength - a.n.strength))
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">All papers in this lineage view</caption>
        <thead>
          <tr className="bg-ground text-left">
            <th scope="col" className="px-4 py-2.5 font-medium">Paper</th>
            {(['year', 'generation', 'strength'] as const).map((k) => (
              <th key={k} scope="col" className="px-4 py-2.5 font-medium" aria-sort={sort === k ? 'descending' : undefined}>
                <button type="button" onClick={() => setSort(k)} className="font-medium">
                  {k === 'strength' ? 'Strongest link' : k[0].toUpperCase() + k.slice(1)}
                  {sort === k ? ' ↓' : ''}
                </button>
              </th>
            ))}
            <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({n, strongest}) => (
            <tr key={n._id} className="border-t border-line">
              <td className="px-4 py-2">
                <Link href={`/paper/${n.slug}`}>{n.shortName}</Link>{' '}
                <button type="button" onClick={() => props.onFocus(n.slug)} className="ml-1 text-xs text-muted underline">
                  focus
                </button>
              </td>
              <td className="tabular px-4 py-2 font-mono text-xs">{n.year}</td>
              <td className="tabular px-4 py-2 font-mono text-xs">{n.generation}</td>
              <td className="tabular px-4 py-2 font-mono text-xs">{strongest ? `${strongest.mentions}× (${strongest.methodMentions} in Method)` : '—'}</td>
              <td className="px-4 py-2">{strongest && <RelationChip relation={strongest.relation} decision={strongest.decision} />}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
