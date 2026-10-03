import assert from 'node:assert/strict'
import {test} from 'node:test'
import {inDateOrder, isVerbatim} from './verify.ts'

const source = `We learn a predefined number of latent input queries which are fed to a Transformer
and cross-attend to the visual features. The “Perceiver Resampler” outputs 64 tokens.`

test('a quote must appear verbatim, tolerating whitespace, curly quotes and edge ellipses', () => {
  assert.ok(isVerbatim('we learn a predefined number of latent input queries which are fed to a Transformer and cross-attend', source))
  assert.ok(isVerbatim('"The "Perceiver Resampler" outputs 64 tokens."', source))
  assert.ok(isVerbatim('…latent input queries which are fed to a Transformer…', source))
})

test('paraphrases, altered numbers and tiny fragments are rejected', () => {
  assert.ok(!isVerbatim('We learn a fixed set of latent queries that attend to visual features', source))
  assert.ok(!isVerbatim('The Perceiver Resampler outputs 32 tokens.', source))
  assert.ok(!isVerbatim('Transformer', source), 'too short to count as a quote')
})

test('chains must be ordered oldest → newest', () => {
  assert.ok(inDateOrder(['2018-10-01', '2021-03-04', '2022-04-29', '2023-01-30']))
  assert.ok(inDateOrder(['2021-01-01', '2021-01-01']))
  assert.ok(!inDateOrder(['2023-01-30', '2022-04-29']))
})

test('markdown emphasis in a Knowledge Base entry does not break a verbatim match', () => {
  const entry = 'A fixed set of **32 learnable query embeddings** (each 768-dimensional) serve as input to the image transformer.'
  assert.ok(isVerbatim('A fixed set of 32 learnable query embeddings (each 768-dimensional) serve as input', entry))
  assert.ok(!isVerbatim('A fixed set of 64 learnable query embeddings', entry))
})
