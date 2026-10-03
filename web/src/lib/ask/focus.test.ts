import assert from 'node:assert/strict'
import {test} from 'node:test'
import {answerSubject} from './focus.ts'

const papers = [
  {slug: 'blip', shortName: 'BLIP', publishedAt: '2022-01-28'},
  {slug: 'blip-2', shortName: 'BLIP-2', publishedAt: '2023-01-30'},
  {slug: 'clip', shortName: 'CLIP', publishedAt: '2021-02-26'},
  {slug: 'vit', shortName: 'ViT', publishedAt: '2020-10-22'},
  {slug: 'convirt', shortName: 'ConVIRT', publishedAt: '2020-10-02'},
]

test('the paper the question names wins, longest name first', () => {
  assert.equal(answerSubject("Where did BLIP-2's Q-Former come from?", papers)?.slug, 'blip-2')
  assert.equal(answerSubject('What did CLIP build on?', papers, [papers[4]])?.slug, 'clip')
  assert.equal(answerSubject('Compare BLIP and ViT', papers)?.slug, 'blip')
})

test('no partial-word matches: "clipped" is not CLIP', () => {
  assert.equal(answerSubject('Which papers clipped gradients?', papers), null)
})

test('without a named paper, the newest paper the answer showed', () => {
  assert.equal(answerSubject('What came before masked image modelling?', papers, [papers[3], papers[1], papers[2]])?.slug, 'blip-2')
  assert.equal(answerSubject('Hello', papers, []), null)
})
