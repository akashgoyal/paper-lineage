// How Sanity Knowledge Base + Context MCP are configured and used. Run: node kb-mcp.svg.mjs
import {writeFileSync} from 'node:fs'
const C = {
  sanity: {fill: '#E8412E', stroke: '#9F2414', text: '#FFFFFF', weight: 700},
  onsanity: {fill: '#FDE3D0', stroke: '#E8412E', text: '#3D1408', weight: 600},
  ours: {fill: '#EEF2FB', stroke: '#8A9AC9', text: '#1E2A4A', weight: 600},
  third: {fill: '#F6F6F7', stroke: '#A1A1AA', text: '#3F3F46', weight: 600, dash: '5 4'},
}
const out = []
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const text = (x, y, s, {size = 15, weight = 400, fill = '#27272A', anchor = 'middle', italic = false} = {}) =>
  out.push(`<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}"${italic ? ' font-style="italic"' : ''}>${esc(s)}</text>`)
const box = (x, y, w, h, kind, lines) => {
  const k = C[kind]
  out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${k.fill}" stroke="${k.stroke}" stroke-width="2"${k.dash ? ` stroke-dasharray="${k.dash}"` : ''}/>`)
  const lh = 22, top = y + h / 2 - ((lines.length - 1) * lh) / 2 + 6
  lines.forEach((l, i) => text(x + w / 2, top + i * lh, l, {weight: i === 0 ? k.weight : 400, fill: k.text, size: i === 0 ? 17 : 14.5}))
}
const cylinder = (x, y, w, h, lines) => {
  const ry = 14, k = C.sanity
  out.push(`<path d="M ${x} ${y + ry} A ${w / 2} ${ry} 0 0 1 ${x + w} ${y + ry} L ${x + w} ${y + h - ry} A ${w / 2} ${ry} 0 0 1 ${x} ${y + h - ry} Z" fill="${k.fill}" stroke="${k.stroke}" stroke-width="2"/>`)
  out.push(`<path d="M ${x} ${y + ry} A ${w / 2} ${ry} 0 0 0 ${x + w} ${y + ry}" fill="none" stroke="${k.stroke}" stroke-width="2"/>`)
  lines.forEach((l, i) => text(x + w / 2, y + h / 2 - 8 + i * 22, l, {weight: i === 0 ? 700 : 400, fill: '#fff', size: i === 0 ? 17 : 14.5}))
}
const line = (pts, {label, lx, ly, both = false, dashed = false, anchor = 'middle'} = {}) => {
  out.push(`<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="#52525B" stroke-width="1.8"${dashed ? ' stroke-dasharray="5 4"' : ''} marker-end="url(#arrow)"${both ? ' marker-start="url(#arrow)"' : ''}/>`)
  if (label) text(lx, ly, label, {size: 13, fill: '#3F3F46', italic: true, anchor})
}
const head = (x, y, s, fill = '#5B6585') => text(x, y, s, {size: 14, weight: 700, fill, anchor: 'start'})

// column frames
out.push('<rect x="20" y="20" width="350" height="720" rx="12" fill="#FAFAFB" stroke="#D4D4D8" stroke-width="1.5"/>')
out.push('<rect x="400" y="20" width="580" height="720" rx="12" fill="#FFF5F3" stroke="#E8412E" stroke-width="3"/>')
out.push('<rect x="1010" y="20" width="570" height="720" rx="12" fill="#FAFAFB" stroke="#C7CCDA" stroke-width="1.5"/>')
head(40, 50, '1 · SOURCES')
head(420, 50, '2 · CONFIGURE ONCE  ·  SANITY CONTEXT', '#9F2414')
head(1030, 50, '3 · USE ON EVERY QUESTION')

// sources
box(45, 80, 300, 110, 'third', ['40 paper PDFs', '+ papers manifest + concept glossary', '42 files · 206 MB'])
text(195, 220, 'sanity context create', {size: 13.5, fill: '#3F3F46', italic: true})
text(195, 240, '→ imports create → build', {size: 13.5, fill: '#3F3F46', italic: true})
cylinder(70, 440, 250, 170, ['Sanity Content Lake', 'production dataset', '197 papers · 1,349 links', '205 concepts'])

// configure
box(425, 80, 530, 110, 'sanity', ['Sanity Knowledge Base', 'Paper Lineage: papers · kbawj3190IH1', '42 sources → 20 entries · 12 open issues'])
box(425, 245, 530, 130, 'sanity', ['Context MCP · paper-lineage-papers', 'mode: Knowledge Base (source: the KB above)', 'instructions: explain how / why / results,', 'cite the paper and section'])
box(425, 440, 530, 170, 'sanity', ['Context MCP · paper-lineage-graph', 'mode: GROQ (source: jd22zcim.production)', 'groqFilter: paper · influence · concept · storyline', 'instructions: schema guide; a relation only', 'when the link is accepted'])
box(425, 650, 530, 70, 'onsanity', ['Organisation token · Context Viewer', 'read-only; sent with every MCP call'])

// use
box(1035, 80, 520, 110, 'ours', ['initial_context from both endpoints', 'fetched once, put in the system prompt', '(the model starts with the schema and the KB outline)'])
box(1035, 300, 520, 120, 'ours', ['/api/ask agent (our code)', 'model: DeepSeek-V4-Flash via Together AI', 'its own tool loop over both endpoints'])
box(1035, 560, 520, 120, 'ours', ['Answer: lead + evidence cards', 'every card re-read from the Content Lake;', 'quotes checked word for word'])

// edges
line([[345, 135], [425, 135]])
line([[690, 190], [690, 245]])
line([[320, 525], [425, 525]])
line([[955, 310], [1035, 340]], {both: true, label: 'knowledge_base_search · _read', lx: 1040, ly: 288, anchor: 'start'})
line([[955, 525], [1035, 390]], {both: true, label: 'groq_query', lx: 1045, ly: 445, anchor: 'start'})
line([[1295, 300], [1295, 190]], {dashed: true})
line([[1295, 420], [1295, 560]])
line([[690, 650], [690, 610]], {dashed: true})

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="760" viewBox="0 0 1600 760" font-family="Helvetica, Arial, sans-serif">
<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#52525B"/></marker></defs>
<rect width="1600" height="760" fill="#ffffff"/>
${out.join('\n')}
</svg>`
writeFileSync('kb-mcp.svg', svg)
