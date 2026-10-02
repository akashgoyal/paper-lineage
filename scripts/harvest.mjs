#!/usr/bin/env node
// Harvests a lineage graph backwards from a root arXiv paper by reading full text.
//
// For each paper we read its ar5iv / arXiv HTML render, parse the bibliography, and record
// every in-text citation with its sentence and section. Influence is scored from how often
// and where a reference is cited (Method > Related Work), which is a better lineage signal
// than raw citation counts. Bibliography entries are resolved to arXiv IDs via OpenAlex title search; metadata comes from the arXiv API in batches.
//
// Output (data/raw/, every network call cached so re-runs are cheap):
//   html/<arxivId>.html      full-text renders
//   openalex/<hash>.json     title → arXiv ID lookups
//   search/id-<arxivId>.json arXiv metadata
//   graph.json               { root, papers: {id: meta}, edges: [{citing, cited, mentions, sections, contexts}] }
//
// Usage: node scripts/harvest.mjs [arXivId] [--max 150] [--depth 3] [--breadth 1]

import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {existsSync} from 'node:fs'
import {mkdir, readFile, unlink, writeFile} from 'node:fs/promises'
import path from 'node:path'
import {parse} from 'node-html-parser'
import {XMLParser} from 'fast-xml-parser'

const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? Number(args[i + 1]) : fallback
}
const ROOT = args.find((a) => /^\d{4}\.\d{4,5}$/.test(a)) ?? '2301.12597' // BLIP-2
const MAX_PAPERS = flag('max', 150)
const MAX_DEPTH = flag("depth", 3)
const BREADTH = flag('breadth', 1) // multiplies the per-paper follow budget below depth 0

// Which references to follow from a paper at depth d (scores computed per citing paper).
// Deeper levels need a stronger signal and get a smaller per-paper budget.
const FOLLOW = [
  {keep: (s) => s.mentions >= 2 || s.methodMentions >= 1, perPaper: 40},
  {keep: (s) => (s.methodMentions >= 1 && s.mentions >= 2) || s.mentions >= 4, perPaper: 8},
  {keep: (s) => s.methodMentions >= 2 || s.mentions >= 5, perPaper: 4},
]

const OUT = path.resolve('data/raw')
const METHOD_SECTION = /method|approach|model|architecture|pre-?train|framework|preliminar|background|setup|implementation/i
const RELATED_SECTION = /related|prior work|previous work/i

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const xml = new XMLParser({ignoreAttributes: false, attributeNamePrefix: ''})
const normTitle = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const words = (t) => new Set(normTitle(t).split(' ').filter((w) => w.length > 2))
const similarity = (a, b) => {
  const A = words(a), B = words(b)
  if (!A.size || !B.size) return 0
  let hit = 0
  for (const w of A) if (B.has(w)) hit++
  return hit / Math.max(A.size, B.size)
}

let lastArxivCall = 0
async function arxivApi(query) {
  // arXiv asks for at most one request every 3 seconds.
  const wait = lastArxivCall + 3_100 - Date.now()
  if (wait > 0) await sleep(wait)
  lastArxivCall = Date.now()
  for (let attempt = 0; attempt < 8; attempt++) {
    const res = await fetch(`https://export.arxiv.org/api/query?${query}`)
    if (res.ok) {
      const feed = xml.parse(await res.text()).feed
      const entries = feed?.entry ? [feed.entry].flat() : []
      return entries.map(entryToMeta)
    }
    await sleep(res.status === 429 ? 30_000 * (attempt + 1) : 5_000 * (attempt + 1))
  }
  throw new Error(`arXiv API failed: ${query}`)
}

function entryToMeta(e) {
  const id = String(e.id).replace(/^https?:\/\/arxiv\.org\/abs\//, '').replace(/v\d+$/, '')
  const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()
  return {
    arxivId: id,
    title: clean(e.title),
    abstract: clean(e.summary),
    published: String(e.published).slice(0, 10),
    authors: [e.author].flat().filter(Boolean).map((a) => clean(a.name)),
    primaryCategory: e['arxiv:primary_category']?.term,
    comment: e['arxiv:comment'] ? clean(e['arxiv:comment']['#text'] ?? e['arxiv:comment']) : undefined,
  }
}

async function cached(file, fetcher) {
  if (existsSync(file)) return JSON.parse(await readFile(file, 'utf8'))
  const data = await fetcher()
  await mkdir(path.dirname(file), {recursive: true})
  await writeFile(file, JSON.stringify(data, null, 2))
  return data
}

// Full text of a paper: LaTeXML HTML (ar5iv, then arXiv's own render), else the PDF via pdftotext.
async function fullText(arxivId) {
  const htmlFile = path.join(OUT, 'html', `${arxivId}.html`)
  const pdfFile = path.join(OUT, 'pdf', `${arxivId}.txt`)
  if (existsSync(htmlFile) && (await readFile(htmlFile, 'utf8'))) return {kind: 'html', body: await readFile(htmlFile, 'utf8')}
  if (existsSync(pdfFile)) {
    const body = await readFile(pdfFile, 'utf8')
    return body ? {kind: 'pdf', body} : null
  }
  if (!existsSync(htmlFile)) {
    for (const url of [`https://ar5iv.labs.arxiv.org/html/${arxivId}`, `https://arxiv.org/html/${arxivId}`]) {
      await sleep(1_500)
      const res = await fetch(url, {redirect: 'follow'})
      if (!res.ok) continue
      const html = await res.text()
      // ar5iv redirects to arxiv.org/abs when it has no render; require a real bibliography.
      if (!html.includes('ltx_bibitem')) continue
      await mkdir(path.dirname(htmlFile), {recursive: true})
      await writeFile(htmlFile, html)
      return {kind: 'html', body: html}
    }
    await mkdir(path.dirname(htmlFile), {recursive: true})
    await writeFile(htmlFile, '') // remember the miss
  }

  await mkdir(path.dirname(pdfFile), {recursive: true})
  let text = ''
  try {
    await sleep(1_500)
    const res = await fetch(`https://arxiv.org/pdf/${arxivId}`)
    if (res.ok) {
      const pdf = path.join(OUT, 'pdf', `${arxivId}.pdf`)
      await writeFile(pdf, Buffer.from(await res.arrayBuffer()))
      text = execFileSync('pdftotext', ['-enc', 'UTF-8', pdf, '-'], {maxBuffer: 64 * 1024 * 1024}).toString()
      await unlink(pdf)
    }
  } catch (err) {
    console.warn(`  pdf failed for ${arxivId}: ${err.message}`)
  }
  await writeFile(pdfFile, text)
  return text ? {kind: 'pdf', body: text} : null
}

// An author list is mostly capitalised name tokens separated by commas or "and".
function looksLikeAuthors(s) {
  const tokens = s.split(/[\s,]+/).filter(Boolean)
  const names = tokens.filter((t) => /^([A-Z][\w'’.-]*|and|&)$/.test(t)).length
  return (s.match(/,/g)?.length ?? 0) >= 2 && names / tokens.length > 0.8
}

// Parse references + in-text citations from plain PDF text. Handles numeric ([12], [3, 7–9])
// and author-year ("Radford et al., 2021") styles. Rougher than the HTML path, but it lets the
// walk continue through papers that have no LaTeXML render.
export function parsePdfText(text) {
  // Small caps come out of pdftotext as "R EFERENCES" / "3 M ETHOD"; glue them back together.
  const lines = text.split('\n').map((l) => l.replace(/\b([A-Z]) ([A-Z]{2,})\b/g, '$1$2'))
  const refStart = lines.findLastIndex((l) => /^\s*(references|bibliography)\s*$/i.test(l))
  if (refStart < 0) return []
  const body = lines.slice(0, refStart)
  const refText = lines.slice(refStart + 1).join('\n').split(/\n\s*(appendix|supplementary material)\b/i)[0]

  const numeric = /^\s*\[\d+\]/m.test(refText)
  const rawEntries = numeric
    ? refText.split(/\n\s*(?=\[\d+\])/)
    : refText.split(/\n\s*\n|\n(?=[A-Z][a-zA-Z'’-]+,\s+(?:[A-Z]\.|[A-Z][a-z]+))|(?<=\b(?:19|20)\d{2}[a-z]?\.)\s*\n/)
  const entries = rawEntries
    .map((e) => e.replace(/-\n(?=[a-z])/g, '').replace(/\s+/g, ' ').trim())
    .filter((e) => e.length > 30)
    .map((raw, i) => {
      const num = raw.match(/^\[(\d+)\]/)?.[1]
      const year = raw.match(/\b(19|20)\d{2}\b/)?.[0]
      const author = raw.replace(/^\[\d+\]\s*/, '')
      const surname = (author.match(/^([A-Z][\w'’-]+),/) ?? author.match(/^(?:[A-Z][\w.'’-]*\s)+?([A-Z][\w'’-]+)(?:,| and | et al)/))?.[1]
      // Title guess: the longest period-separated segment that doesn't look like an author list.
      const title = raw.replace(/^\[\d+\]\s*/, '').split(/\.\s+/)
        .filter((s) => s.split(' ').length >= 4 && !looksLikeAuthors(s) && !/\b(In|Proceedings|arXiv|Conference|Journal)\b/.test(s.slice(0, 15)))
        .map((s) => ({s, score: s.length - 25 * (s.match(/,/g)?.length ?? 0)}))
        .sort((a, b) => b.score - a.score)[0]?.s ?? ''
      return {
        key: num ? `n${num}` : `a${i}`, num, year, surname, raw, title,
        arxivId: raw.match(/arXiv[:\s]*(?:preprint\s*)?(?:arXiv:)?\s*(\d{4}\.\d{4,5})/i)?.[1] ?? raw.match(/arxiv\.org\/abs\/(\d{4}\.\d{4,5})/)?.[1],
        mentions: 0, methodMentions: 0, relatedMentions: 0, sections: new Set(), contexts: [],
      }
    })
  const byNum = new Map(entries.filter((e) => e.num).map((e) => [e.num, e]))

  let heading = ''
  const paragraphs = []
  let buf = []
  for (const line of body) {
    const h = line.trim().match(/^(\d+(?:\.\d+)?)\.?\s+([A-Z][A-Za-z -]{2,50})$/)
    if (h) {
      paragraphs.push({heading, text: buf.join(' ')}), (buf = []), (heading = h[2])
      continue
    }
    buf.push(line.endsWith('-') ? line.slice(0, -1) : line)
  }
  paragraphs.push({heading, text: buf.join(' ')})

  const record = (entry, sec, sentence) => {
    entry.mentions++
    if (METHOD_SECTION.test(sec)) entry.methodMentions++
    if (RELATED_SECTION.test(sec)) entry.relatedMentions++
    entry.sections.add(sec)
    if (entry.contexts.length < 4 && !entry.contexts.some((c) => c.text === sentence)) {
      entry.contexts.push({section: sec, text: sentence.slice(0, 600)})
    }
  }
  for (const {heading: sec, text} of paragraphs) {
    for (const sentence of text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+(?=[A-Z])/)) {
      if (numeric) {
        for (const m of sentence.matchAll(/\[(\d+(?:\s*[,–-]\s*\d+)*)\]/g)) {
          const nums = m[1].split(',').flatMap((part) => {
            const [a, b] = part.split(/[–-]/).map((n) => Number(n.trim()))
            return b ? Array.from({length: Math.min(b - a + 1, 20)}, (_, k) => String(a + k)) : [String(a)]
          })
          for (const n of nums) if (byNum.has(n)) record(byNum.get(n), sec, sentence)
        }
      } else {
        for (const e of entries) {
          if (e.surname && e.year && sentence.includes(e.surname) && sentence.includes(e.year)) record(e, sec, sentence)
        }
      }
    }
  }
  return entries.map((e) => ({...e, sections: [...e.sections]}))
}

// Parse bibliography + every in-text citation (sentence and section) from a LaTeXML render.
export function parsePaper(html) {
  const doc = parse(html)
  const bib = new Map()
  for (const li of doc.querySelectorAll('li.ltx_bibitem')) {
    const blocks = li.querySelectorAll('.ltx_bibblock').map((b) => b.text.replace(/\s+/g, ' ').trim())
    const raw = blocks.join(' ')
    bib.set(li.id, {
      key: li.id,
      raw,
      title: (blocks[1] ?? blocks[0] ?? '').replace(/\.$/, ''),
      arxivId: raw.match(/arXiv[:\s]*(?:preprint\s*)?(?:arXiv:)?\s*(\d{4}\.\d{4,5})/i)?.[1],
      mentions: 0,
      methodMentions: 0,
      relatedMentions: 0,
      sections: new Set(),
      contexts: [],
    })
  }

  for (const section of doc.querySelectorAll('section.ltx_section')) {
    const heading = section.querySelector('h2')?.text.replace(/\s+/g, ' ').replace(/^\d+\s*/, '').trim() ?? ''
    for (const p of section.querySelectorAll('p.ltx_p')) {
      const cites = p.querySelectorAll('a.ltx_ref[href^="#bib."]')
      if (!cites.length) continue
      const sentences = p.text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+(?=[A-Z])/)
      for (const a of cites) {
        const entry = bib.get(a.getAttribute('href').slice(1))
        if (!entry) continue
        entry.mentions++
        if (METHOD_SECTION.test(heading)) entry.methodMentions++
        if (RELATED_SECTION.test(heading)) entry.relatedMentions++
        entry.sections.add(heading)
        const label = a.text.replace(/\s+/g, ' ').trim()
        const sentence = sentences.find((s) => s.includes(label)) ?? sentences[0]
        if (sentence && entry.contexts.length < 4 && !entry.contexts.some((c) => c.text === sentence)) {
          entry.contexts.push({section: heading, text: sentence.slice(0, 600)})
        }
      }
    }
  }
  return [...bib.values()].map((e) => ({...e, sections: [...e.sections]}))
}

// Resolve a bibliography entry to an arXiv ID, cheapest source first:
// the ID printed in the entry → OpenAlex title search → arXiv title search.
// A failed lookup just leaves the reference unresolved; it never stops the walk.
async function resolve(entry, metaById) {
  if (entry.arxivId) {
    if (!metaById.has(entry.arxivId)) metaById.set(entry.arxivId, {arxivId: entry.arxivId, title: entry.title})
    return metaById.get(entry.arxivId)
  }
  if (normTitle(entry.title).split(' ').length < 3) return undefined
  const hash = createHash('sha1').update(normTitle(entry.title)).digest('hex').slice(0, 16)
  const pick = (results) => results
    .filter((r) => r.arxivId)
    .map((r) => ({r, score: similarity(r.title, entry.title)}))
    .sort((a, b) => b.score - a.score)
    .find((x) => x.score >= 0.8)?.r
  try {
    let hit
    if (openAlexAvailable || existsSync(path.join(OUT, 'openalex', `${hash}.json`))) {
      hit = pick(await cached(path.join(OUT, 'openalex', `${hash}.json`), () => openAlexSearch(entry.title)).catch(() => []))
    }
    hit ??= pick(await cached(path.join(OUT, 'arxiv-search', `${hash}.json`), () => arxivTitleSearch(entry.title)))
    if (!hit) return undefined
    if (!metaById.has(hit.arxivId)) metaById.set(hit.arxivId, {arxivId: hit.arxivId, title: hit.title})
    return metaById.get(hit.arxivId)
  } catch (err) {
    console.warn(`  unresolved "${entry.title.slice(0, 60)}": ${err.message}`)
    return undefined
  }
}

let openAlexAvailable = true
async function openAlexSearch(title) {
  const url = `https://api.openalex.org/works?search=${encodeURIComponent(normTitle(title).slice(0, 200))}&per_page=8&select=title,ids,locations`
  for (let attempt = 0; attempt < 4; attempt++) {
    await sleep(250)
    const res = await fetch(url)
    if (res.ok) {
      return (await res.json()).results.map((w) => ({
        title: w.title ?? '',
        arxivId: (w.locations ?? []).map((l) => l.landing_page_url ?? '').join(' ').match(/arxiv\.org\/abs\/(\d{4}\.\d{4,5})/)?.[1]
          ?? (w.ids?.doi ?? '').match(/arxiv\.(\d{4}\.\d{4,5})/i)?.[1],
      }))
    }
    if (res.status === 429) {
      const body = await res.json().catch(() => ({}))
      if (body.dailyRemainingUsd === 0) {
        // Keyless daily budget is gone; fall through to arXiv search for the rest of the run.
        openAlexAvailable = false
        console.warn('  OpenAlex daily budget exhausted; using arXiv title search from here on')
        throw new Error('OpenAlex budget exhausted')
      }
    } else if (res.status >= 400 && res.status < 500) {
      return [] // bad query, not a transient error
    }
    await sleep(2_000 * 2 ** attempt)
  }
  throw new Error(`OpenAlex search failed: ${title}`)
}

// arXiv's title search drops nothing for you: stopwords in a ti: AND query make it return 0 hits.
const STOPWORDS = new Set('a an and are as at be by for from in into is it of on or the to via with without we our its using toward towards do does better than more beyond what when how'.split(' '))
async function arxivTitleSearch(title) {
  const terms = normTitle(title).split(' ').filter((w) => w.length > 2 && !STOPWORDS.has(w)).slice(0, 7)
  if (terms.length < 2) return []
  return arxivApi(`search_query=${encodeURIComponent(terms.map((w) => `ti:${w}`).join(' AND '))}&max_results=5`)
}

// Full arXiv metadata (abstract, authors, dates) for many IDs in a few batched calls.
async function fillMetadata(ids, metaById) {
  const missing = ids.filter((id) => !metaById.get(id)?.abstract)
  for (const id of [...missing]) {
    const file = path.join(OUT, 'search', `id-${id}.json`)
    if (!existsSync(file)) continue
    const [m] = JSON.parse(await readFile(file, 'utf8'))
    if (m) metaById.set(id, m), missing.splice(missing.indexOf(id), 1)
  }
  for (let i = 0; i < missing.length; i += 50) {
    const batch = missing.slice(i, i + 50)
    let metas = []
    try {
      metas = await arxivApi(`id_list=${batch.join(',')}&max_results=50`)
    } catch (err) {
      console.warn(`  metadata batch failed, re-run later to fill it: ${err.message}`)
      continue
    }
    for (const m of metas) {
      metaById.set(m.arxivId, m)
      await writeFile(path.join(OUT, 'search', `id-${m.arxivId}.json`), JSON.stringify([m], null, 2))
    }
    console.log(`  metadata ${Math.min(i + 50, missing.length)}/${missing.length}`)
  }
}

async function main() {
  const metaById = new Map()
  const [rootMeta] = await cached(path.join(OUT, 'search', `id-${ROOT}.json`), () => arxivApi(`id_list=${ROOT}`))
  metaById.set(ROOT, rootMeta)
  console.log(`Root: ${rootMeta.title}`)

  const depthOf = new Map([[ROOT, 0]])
  const sourceOf = new Map()
  const parsed = new Map() // arxivId -> parsed bibliography entries (resolved)
  const queue = [ROOT]

  while (queue.length) {
    const id = queue.shift()
    const depth = depthOf.get(id)
    const text = await fullText(id)
    if (!text) {
      console.log(`d${depth} ${id}: no full text, leaf`)
      parsed.set(id, [])
      continue
    }
    const entries = text.kind === 'html' ? parsePaper(text.body) : parsePdfText(text.body)
    sourceOf.set(id, text.kind)
    const rule = FOLLOW[depth]
    // Only spend arXiv lookups on entries we might follow or that could link to kept papers.
    const candidates = entries
      .filter((e) => depth < MAX_DEPTH && rule?.keep(e))
      .sort((a, b) => b.methodMentions - a.methodMentions || b.mentions - a.mentions)
      .slice(0, Math.round((rule?.perPaper ?? 0) * (depth > 0 ? BREADTH : 1)))
    let followed = 0
    for (const e of candidates) {
      const m = await resolve(e, metaById)
      if (!m) continue
      e.resolved = m.arxivId
      if (!depthOf.has(m.arxivId) && depthOf.size < MAX_PAPERS) {
        depthOf.set(m.arxivId, depth + 1)
        queue.push(m.arxivId)
        followed++
      }
    }
    parsed.set(id, entries)
    console.log(`d${depth} ${id} ${metaById.get(id)?.title.slice(0, 60)}: ${entries.length} refs, follow ${followed} (total ${depthOf.size})`)
  }

  // Cross edges: resolve remaining bib entries against the kept set by title, without new lookups.
  const kept = [...depthOf.keys()]
  await fillMetadata(kept, metaById)
  const byTitle = kept.map((id) => [id, metaById.get(id)?.title ?? ''])
  const edges = []
  for (const [citing, entries] of parsed) {
    for (const e of entries) {
      let cited = e.resolved ?? (e.arxivId && depthOf.has(e.arxivId) ? e.arxivId : undefined)
      if (!cited) {
        const hit = byTitle.find(([, t]) => similarity(t, e.title) >= 0.85)
        cited = hit?.[0]
      }
      if (!cited || cited === citing || !depthOf.has(cited)) continue
      edges.push({
        citing, cited,
        mentions: e.mentions, methodMentions: e.methodMentions, relatedMentions: e.relatedMentions,
        sections: e.sections, contexts: e.contexts, bibText: e.raw.slice(0, 300),
      })
    }
  }

  const papers = Object.fromEntries(kept.map((id) => [id, {...metaById.get(id), depth: depthOf.get(id), fullTextSource: sourceOf.get(id) ?? null}]))
  await writeFile(path.join(OUT, 'graph.json'), JSON.stringify({root: ROOT, papers, edges}, null, 2))
  console.log(`Done: ${kept.length} papers, ${edges.length} edges → data/raw/graph.json`)
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((err) => {
  console.error(err)
  process.exit(1)
})
