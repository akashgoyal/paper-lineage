import assert from 'node:assert/strict'
import {test} from 'node:test'
import type {Card} from '../../lib/ask/cards.ts'
import {applyEvent, parseLines, toHistory, type Turn} from './stream.ts'

const start: Turn = {id: 't', question: 'Where did the Q-Former come from?', parts: [], followUps: [], status: 'streaming'}
const chain: Card = {type: 'chain', steps: [], links: []}

test('text deltas merge until a card arrives, then a new text part starts', () => {
  let t = applyEvent(start, {type: 'text', delta: 'The Q-Former '})
  t = applyEvent(t, {type: 'text', delta: 'is BLIP-2’s.'})
  t = applyEvent(t, {type: 'card-start', id: 'c1', tool: 'showChain'})
  t = applyEvent(t, {type: 'card', id: 'c1', card: chain})
  t = applyEvent(t, {type: 'text', delta: 'But…'})
  assert.equal(t.parts.length, 3)
  assert.deepEqual(t.parts[0], {kind: 'text', text: 'The Q-Former is BLIP-2’s.'})
  assert.equal(t.parts[1].kind === 'card' && t.parts[1].card?.type, 'chain')
})

test('a refused card disappears, follow-ups and sources land in their own slots, done clears skeletons', () => {
  let t = applyEvent(start, {type: 'card-start', id: 'bad', tool: 'showQuote'})
  t = applyEvent(t, {type: 'card-error', id: 'bad', message: 'not verbatim'})
  assert.equal(t.parts.length, 0)
  t = applyEvent(t, {type: 'card-start', id: 'pending', tool: 'showPapers'})
  t = applyEvent(t, {type: 'card', id: 'f', card: {type: 'followups', items: ['a?', 'b?']}})
  t = applyEvent(t, {type: 'sources', verified: 1, unreviewed: 2, papers: 4})
  t = applyEvent(t, {type: 'outcome', outcome: 'partial'})
  t = applyEvent(t, {type: 'done'})
  assert.deepEqual(t.followUps, ['a?', 'b?'])
  assert.deepEqual(t.sources, {verified: 1, unreviewed: 2, papers: 4})
  assert.equal(t.outcome, 'partial')
  assert.equal(t.status, 'done')
  assert.equal(t.parts.length, 0, 'unresolved skeleton removed on done')
})

test('NDJSON parsing keeps a partial trailing line for the next chunk', () => {
  const {events, rest} = parseLines('{"type":"text","delta":"a"}\n{"type":"done"}\n{"type":"te')
  assert.equal(events.length, 2)
  assert.equal(rest, '{"type":"te')
})

test('history sends questions with the text of answered turns only', () => {
  const answered = {...start, parts: [{kind: 'text' as const, text: 'It came from…'}], status: 'done' as const}
  const failed = {...start, id: 'u', question: 'x', parts: [], status: 'error' as const}
  assert.deepEqual(toHistory([answered, failed]), [
    {role: 'user', content: start.question},
    {role: 'assistant', content: 'It came from…'},
  ])
})

test('the lead arrives last but is placed above the cards, replacing any earlier text', () => {
  let t = applyEvent(start, {type: 'card-start', id: 'c1', tool: 'showChain'})
  t = applyEvent(t, {type: 'card', id: 'c1', card: chain})
  t = applyEvent(t, {type: 'text', delta: 'The Q-Former is BLIP-2’s own module.', lead: true})
  assert.deepEqual(t.parts.map((p) => p.kind), ['text', 'card'])
  assert.equal(t.parts[0].kind === 'text' && t.parts[0].text, 'The Q-Former is BLIP-2’s own module.')
})

test('status events show the current step and clear when the answer is done', () => {
  let t = applyEvent(start, {type: 'status', text: 'Searching the lineage graph…'})
  assert.equal(t.activity, 'Searching the lineage graph…')
  t = applyEvent(t, {type: 'done'})
  assert.equal(t.activity, undefined)
})
