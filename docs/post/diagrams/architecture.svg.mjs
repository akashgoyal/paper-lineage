// Hand-laid architecture diagram (exact positions so lines never cross). Run: node architecture.svg.mjs
import {writeFileSync} from 'node:fs'
const C = {
  sanity: {fill: '#E8412E', stroke: '#9F2414', text: '#FFFFFF', weight: 700},
  onsanity: {fill: '#FDE3D0', stroke: '#E8412E', text: '#3D1408', weight: 600},
  ours: {fill: '#EEF2FB', stroke: '#8A9AC9', text: '#1E2A4A', weight: 600},
  third: {fill: '#F6F6F7', stroke: '#A1A1AA', text: '#3F3F46', weight: 500, dash: '5 4'},
}
const out = []
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const text = (x, y, s, {size = 15, weight = 400, fill = '#27272A', anchor = 'middle', italic = false} = {}) =>
  out.push(`<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}"${italic ? ' font-style="italic"' : ''}>${esc(s)}</text>`)
const box = (x, y, w, h, kind, l1, l2) => {
  const k = C[kind]
  out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${k.fill}" stroke="${k.stroke}" stroke-width="2"${k.dash ? ` stroke-dasharray="${k.dash}"` : ''}/>`)
  text(x + w / 2, y + h / 2 + (l2 ? -4 : 5), l1, {weight: k.weight, fill: k.text, size: 15.5})
  if (l2) text(x + w / 2, y + h / 2 + 15, l2, {size: 13, fill: k.text, weight: 400})
}
const pill = (x, y, w, label) => {
  out.push(`<rect x="${x}" y="${y}" width="${w}" height="40" rx="20" fill="#fff" stroke="#17191E" stroke-width="1.5"/>`)
  text(x + w / 2, y + 25, label, {weight: 600})
}
const line = (pts, {label, lx, ly, both = false, dashed = false} = {}) => {
  out.push(`<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="#52525B" stroke-width="1.6"${dashed ? ' stroke-dasharray="5 4"' : ''} marker-end="url(#arrow)"${both ? ' marker-start="url(#arrow)"' : ''}/>`)
  if (label) text(lx, ly, label, {size: 11.5, fill: '#3F3F46', italic: true})
}
const cylinder = (x, y, w, h, l1, l2, l3) => {
  const ry = 14, k = C.sanity
  out.push(`<path d="M ${x} ${y + ry} A ${w / 2} ${ry} 0 0 1 ${x + w} ${y + ry} L ${x + w} ${y + h - ry} A ${w / 2} ${ry} 0 0 1 ${x} ${y + h - ry} Z" fill="${k.fill}" stroke="${k.stroke}" stroke-width="2"/>`)
  out.push(`<path d="M ${x} ${y + ry} A ${w / 2} ${ry} 0 0 0 ${x + w} ${y + ry}" fill="none" stroke="${k.stroke}" stroke-width="2"/>`)
  text(x + w / 2, y + h / 2 - 6, l1, {weight: 700, fill: '#fff', size: 15.5})
  text(x + w / 2, y + h / 2 + 14, l2, {size: 12.5, fill: '#fff'})
  text(x + w / 2, y + h / 2 + 31, l3, {size: 12.5, fill: '#fff'})
}

// frames
out.push('<rect x="250" y="30" width="310" height="780" rx="12" fill="#FAFAFB" stroke="#C7CCDA" stroke-width="1.5"/>')
text(405, 56, 'OUR CODE', {size: 13, weight: 700, fill: '#5B6585'})
out.push('<rect x="600" y="30" width="770" height="780" rx="12" fill="#FFF5F3" stroke="#E8412E" stroke-width="3"/>')
text(622, 56, 'SANITY PLATFORM  ·  free plan', {size: 14, weight: 700, fill: '#9F2414', anchor: 'start'})
text(632, 96, 'Read by the agent and the site', {size: 12.5, fill: '#9F2414', anchor: 'start', italic: true})
text(632, 516, 'Curator tools', {size: 12.5, fill: '#9F2414', anchor: 'start', italic: true})

// nodes
box(40, 110, 180, 70, 'third', 'Together AI', 'DeepSeek-V4-Flash')
pill(70, 282, 120, 'Visitor')
pill(70, 542, 120, 'Curator')
box(280, 110, 250, 80, 'ours', '/api/ask', 'agent loop + card checks')
box(280, 270, 250, 64, 'ours', 'Next.js site', 'Ask · Explore · pages')
box(280, 732, 250, 56, 'ours', 'intake runner', 'drains workflow effects')
box(630, 105, 240, 64, 'sanity', 'Sanity Context', 'MCP · GROQ mode')
box(630, 190, 240, 64, 'sanity', 'Sanity Context', 'MCP · Knowledge Base mode')
box(910, 190, 210, 64, 'sanity', 'Sanity Knowledge Base', '40 papers → 20 entries')
box(630, 275, 240, 56, 'sanity', 'Sanity Live Content API')
cylinder(1160, 250, 190, 160, 'Sanity Content Lake', 'papers · links · concepts', 'gaps · stories · workflows')
box(630, 530, 240, 64, 'onsanity', 'Lineage Desk', 'built with Sanity App SDK')
box(630, 640, 240, 64, 'onsanity', 'Sanity Studio', 'custom inputs + actions')
box(910, 530, 210, 64, 'sanity', 'Sanity Workflows', 'paper-intake · approve / send back')
box(910, 640, 210, 64, 'sanity', 'Sanity Agent Actions', 'drafts link explanations')

// edges
line([[220, 145], [280, 145]], {both: true})
line([[190, 302], [280, 302]])
line([[405, 270], [405, 190]])
line([[530, 135], [630, 137]], {label: 'groq_query', lx: 580, ly: 127})
line([[530, 172], [630, 222]], {label: 'knowledge_base_*', lx: 556, ly: 236})
line([[870, 222], [910, 222]])
line([[870, 137], [1255, 137], [1255, 250]])
line([[405, 110], [405, 76], [1310, 76], [1310, 250]], {label: 'every card re-read by _id and checked', lx: 900, ly: 70})
line([[530, 302], [630, 303]], {label: 'live updates', lx: 580, ly: 294})
line([[870, 303], [1160, 303]])
line([[190, 562], [630, 562]])
line([[130, 582], [130, 672], [630, 672]])
line([[820, 530], [820, 470], [1255, 470], [1255, 410]], {label: 'accept / reject + publish', lx: 1040, ly: 462})
line([[870, 562], [910, 562]])
line([[870, 590], [910, 650]], {dashed: true})
line([[1120, 562], [1140, 562], [1140, 760], [530, 760]], {label: 'workflow effects', lx: 840, ly: 752})

// legend
const lg = (y, kind, label) => {
  const k = C[kind]
  out.push(`<rect x="34" y="${y}" width="26" height="16" rx="3" fill="${k.fill}" stroke="${k.stroke}" stroke-width="1.5"${k.dash ? ` stroke-dasharray="${k.dash}"` : ''}/>`)
  text(70, y + 13, label, {size: 13, anchor: 'start'})
}
text(34, 712, 'Legend', {size: 13, weight: 700, anchor: 'start'})
lg(722, 'sanity', 'Sanity feature')
lg(746, 'onsanity', 'our app, built on Sanity')
lg(770, 'ours', 'our code (Vercel / laptop)')
lg(794, 'third', 'third party')

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="830" viewBox="0 0 1400 830" font-family="Helvetica, Arial, sans-serif">
<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#52525B"/></marker></defs>
<rect width="1400" height="830" fill="#ffffff"/>
${out.join('\n')}
</svg>`
writeFileSync('architecture.svg', svg)
