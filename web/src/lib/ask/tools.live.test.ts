// Live, read-only tests of the Ask display tools against the public production dataset.
// Run: npm run test:live   (no tool here writes: draftStoryline / reportOutcome writes are not exercised)
import assert from 'node:assert/strict'
import {test} from 'node:test'
import {AskContext, resolveTool, ToolInputError} from './tools'

const P = (arxiv: string) => `paper-${arxiv.replace('.', '-')}`
const SET_TRANSFORMER = P('1810.00825')
const PERCEIVER = P('2103.03206')
const FLAMINGO = P('2204.14198')
const BLIP2 = P('2301.12597')
const BLIP = P('2201.12086')

test('showChain resolves real link statuses and never invents a relation for unreviewed links', async () => {
  const ctx = new AskContext()
  const {card, summary} = await resolveTool('showChain', {paperIds: [SET_TRANSFORMER, PERCEIVER, FLAMINGO, BLIP2], conceptSlugs: ['inducing-point-attention', 'latent-cross-attention', 'perceiver-resampler', 'q-former']}, ctx)
  assert.equal(card?.type, 'chain')
  if (card?.type !== 'chain') return
  assert.deepEqual(card.steps.map((s) => s.paper.shortName), ['Set Transformer', 'Perceiver', 'Flamingo', 'BLIP-2'])
  assert.equal(card.steps[3].concept?.name, 'Querying Transformer (Q-Former)')
  assert.ok(card.links.every((l) => l.status !== 'verified'), 'nothing is accepted yet, so no relation may appear')
  assert.equal(card.links[2].status, 'cites')
  assert.match(summary, /unreviewed/)
  assert.equal(ctx.sources().unreviewed, card.links.filter((l) => l.status === 'cites').length)
})

test('showChain rejects unknown ids and newest-first ordering', async () => {
  await assert.rejects(resolveTool('showChain', {paperIds: [BLIP2, FLAMINGO]}, new AskContext()), ToolInputError)
  await assert.rejects(resolveTool('showChain', {paperIds: ['paper-0000-00000', BLIP2]}, new AskContext()), /Unknown paper id/)
  await assert.rejects(resolveTool('showChain', {paperIds: [BLIP2]}, new AskContext()), /Invalid input/)
})

test('showPapers returns cards with counts', async () => {
  const {card} = await resolveTool('showPapers', {ids: [BLIP, BLIP2], caption: 'Two generations'}, new AskContext())
  assert.equal(card?.type, 'papers')
  if (card?.type !== 'papers') return
  assert.equal(card.papers.find((p) => p.shortName === 'BLIP-2')?.builtOn, 16)
})

test('showQuote from a link uses the stored citation sentence, not the model’s text', async () => {
  const {card} = await resolveTool('showQuote', {source: {kind: 'link', influenceId: 'influence-2201-12086-2301-12597'}, quote: 'made-up words the model invented'}, new AskContext())
  assert.equal(card?.type, 'quote')
  if (card?.type !== 'quote') return
  assert.match(card.text, /BLIP/)
  assert.ok(!card.text.includes('made-up'))
  assert.equal(card.via, 'citation')
})

test('showComparison requires every row to cite a source that exists', async () => {
  const row = {label: 'Bridge', a: 'Perceiver resampler', b: 'Q-Former'}
  const ok = await resolveTool('showComparison', {a: FLAMINGO, b: BLIP2, rows: [{...row, sources: [{kind: 'doc', id: 'concept-q-former'}]}]}, new AskContext())
  assert.equal(ok.card?.type, 'comparison')
  await assert.rejects(resolveTool('showComparison', {a: FLAMINGO, b: BLIP2, rows: [{...row, sources: [{kind: 'doc', id: 'concept-made-up'}]}]}, new AskContext()), /not found/)
  await assert.rejects(resolveTool('showComparison', {a: FLAMINGO, b: BLIP2, rows: [{...row, sources: []}]}, new AskContext()), /Invalid input/)
})

test('reportOutcome records a gap only for weak answers', async () => {
  const ctx = new AskContext()
  await resolveTool('reportOutcome', {outcome: 'answered'}, ctx)
  assert.equal(ctx.gap, null)
  await resolveTool('reportOutcome', {outcome: 'unanswered'}, ctx)
  assert.equal((ctx.gap as {kind: string} | null)?.kind, 'unanswered')
})
