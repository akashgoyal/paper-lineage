import assert from 'node:assert/strict'
import {test} from 'node:test'
import {suggestEarlier, type Candidate} from './suggested.ts'

const by = (id: string) => ({_id: id, shortName: id, slug: id, publishedAt: '2020-01-01'})
const c = (id: string, paper: string): Candidate => ({_id: id, name: id, slug: id, by: by(paper)})

test('direct ancestors rank before two-step ones, then by citation strength', () => {
  const out = suggestEarlier({
    paper: 'P',
    g1: [{id: 'A', s: 2}, {id: 'B', s: 9}],
    g2: [{via: 'B', id: 'C', s: 20}],
    candidates: [c('from-C', 'C'), c('from-A', 'A'), c('from-B', 'B'), c('unrelated', 'Z')],
  })
  assert.deepEqual(out.map((s) => s.name), ['from-B', 'from-A', 'from-C'])
  assert.equal(out[2].distance, 2)
  assert.equal(out[2].strength, 4.5, 'two-step strength is the weaker hop, halved')
})

test('no introducing paper or no ancestors gives nothing; the paper itself is never its own ancestor', () => {
  assert.deepEqual(suggestEarlier(null), [])
  assert.deepEqual(suggestEarlier({paper: null, g1: [], g2: [], candidates: []}), [])
  assert.deepEqual(suggestEarlier({paper: 'P', g1: [{id: 'A', s: 1}], g2: [{via: 'A', id: 'P', s: 5}], candidates: [c('self', 'P')]}), [])
})
