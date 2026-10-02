#!/usr/bin/env node
// Negative tests for the schema's validation rules. Writes fixture documents to a temp NDJSON file and
// runs `sanity documents validate --file`, which validates against the schema WITHOUT writing to the
// dataset (async rules still read production for lookups). Each case must fail with its expected message,
// and the control document must pass.
import {execFileSync} from 'node:child_process'
import {mkdtempSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

const ref = (_ref) => ({_type: 'reference', _ref})
const paper = (over) => ({_type: 'paper', title: 'Fixture', shortName: 'Fixture', slug: {_type: 'slug', current: 'fixture'}, kind: 'method', publishedAt: '2024-01-01', ...over})
const link = (over) => ({_type: 'influence', provenance: {origin: 'curator', reviewDecision: 'proposed'}, ...over})

const cases = [
  {doc: paper({_id: 'check-ok-paper', arxivId: '2401.00001'}), expect: null, why: 'control: a well-formed paper passes'},
  {doc: paper({_id: 'check-dup-arxiv', arxivId: '2301.12597'}), expect: 'Another paper already has this arXiv ID', why: 'arXiv ID must be unique'},
  {doc: paper({_id: 'check-bad-arxiv', arxivId: 'hep-th/9901001'}), expect: 'Use the bare arXiv ID', why: 'arXiv ID format'},
  {doc: link({_id: 'check-self-link', from: ref('paper-2301-12597'), to: ref('paper-2301-12597')}), expect: 'cannot be its own ancestor', why: 'no self-links'},
  {doc: link({_id: 'check-backwards', from: ref('paper-2301-12597'), to: ref('paper-1512-03385')}), expect: 'published after the later one', why: 'time order'},
  {doc: link({_id: 'check-duplicate', from: ref('paper-2201-12086'), to: ref('paper-2301-12597')}), expect: 'already exists', why: 'one link per pair'},
  {
    doc: link({_id: 'check-accepted-no-relation', from: ref('paper-1706-03762'), to: ref('paper-2301-12597'), provenance: {origin: 'curator', reviewDecision: 'accepted'}}),
    expect: 'An accepted link needs a relation',
    why: 'accepting requires an interpretation',
  },
  {
    doc: link({_id: 'check-bad-evidence', from: ref('paper-1706-03762'), to: ref('paper-2301-12597'), evidenceKey: 'zzz', citation: {contexts: [{_key: 'c0', _type: 'citationContext', text: 'x'}]}}),
    expect: 'Pick one of the citation sentences',
    why: 'evidenceKey must point at a captured sentence',
  },
  {
    doc: {_id: 'check-orphan-concept', _type: 'concept', name: 'Orphan', slug: {_type: 'slug', current: 'orphan'}, level: 'concept', category: 'architecture', summary: 'x', origin: 'curator'},
    expect: 'Every concept belongs to a theme',
    why: 'concepts need a theme',
  },
  {
    doc: {
      _id: 'check-buildson-later', _type: 'concept', name: 'Too early', slug: {_type: 'slug', current: 'too-early'}, level: 'concept',
      broader: ref('concept-theme-vision-transformers'), category: 'architecture', summary: 'x', origin: 'curator',
      introducedBy: ref('paper-2010-11929'), buildsOn: [{...ref('concept-q-former'), _key: 'b0'}],
    },
    expect: 'Introduced after this concept',
    why: 'buildsOn can only point to older ideas',
  },
]

const dir = mkdtempSync(join(tmpdir(), 'pl-validate-'))
const file = join(dir, 'cases.ndjson')
writeFileSync(file, cases.map((c) => JSON.stringify(c.doc)).join('\n') + '\n')

let out = '[]'
try {
  out = execFileSync('npx', ['sanity', 'documents', 'validate', '--file', file, '--format', 'json', '--level', 'error', '--yes'], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']})
} catch (err) {
  out = err.stdout?.toString() || '[]' // the CLI exits 1 when it finds errors, which is the point here
}
const results = JSON.parse(out)
const messages = (id) => results.filter((r) => r.documentId === id).flatMap((r) => r.markers.map((m) => m.message))

let failed = 0
for (const c of cases) {
  const got = messages(c.doc._id)
  const ok = c.expect === null ? got.length === 0 : got.some((m) => m.includes(c.expect))
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.why}${ok ? '' : `\n      expected: ${c.expect ?? '(no errors)'}\n      got: ${JSON.stringify(got)}`}`)
}
console.log(`\nvalidation cases: ${cases.length - failed}/${cases.length} passed`)
process.exit(failed ? 1 : 0)
