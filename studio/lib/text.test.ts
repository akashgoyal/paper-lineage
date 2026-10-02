// Run: node --test lib/   (Node 22.18+ / 26 strip TypeScript types natively)
import assert from 'node:assert/strict'
import {test} from 'node:test'
import {ARXIV_ID, normalizeArxivId, paragraphFor, splitHighlight, squash, surnameOf} from './text.ts'

test('arXiv input normalises every common paste format to the bare ID', () => {
  const cases: Record<string, string> = {
    'https://arxiv.org/abs/2301.12597': '2301.12597',
    'https://arxiv.org/pdf/2301.12597v3': '2301.12597',
    'https://arxiv.org/pdf/2301.12597v3.pdf': '2301.12597',
    'arXiv:2301.12597': '2301.12597',
    '  2301.12597v1  ': '2301.12597',
    '1405.0312': '1405.0312',
    'https://ar5iv.labs.arxiv.org/html/1706.03762': '1706.03762',
  }
  for (const [input, expected] of Object.entries(cases)) {
    assert.equal(normalizeArxivId(input), expected, input)
    assert.ok(ARXIV_ID.test(normalizeArxivId(input)), `valid after normalising: ${input}`)
  }
})

test('arXiv input leaves non-arXiv text alone so validation can flag it', () => {
  assert.equal(normalizeArxivId(' not an id '), 'not an id')
  assert.ok(!ARXIV_ID.test(normalizeArxivId('hep-th/9901001')))
})

test('evidence highlight marks every occurrence of the surname and keeps all text', () => {
  const sentence = 'Flamingo (Alayrac et al. 2022) and Alayrac et al. resort to a generation loss.'
  const parts = splitHighlight(sentence, 'Alayrac')
  assert.equal(parts.filter((p) => p.hit).length, 2)
  assert.equal(parts.map((p) => p.text).join(''), sentence)
})

test('evidence highlight escapes regex characters and handles a missing surname', () => {
  assert.deepEqual(splitHighlight('a (b) c', '(b)').filter((p) => p.hit), [{text: '(b)', hit: true}])
  assert.deepEqual(splitHighlight('no author', undefined), [{text: 'no author', hit: false}])
})

test('surname is the last word of the first author', () => {
  assert.equal(surnameOf('Jean-Baptiste Alayrac'), 'Alayrac')
  assert.equal(surnameOf('  Junnan   Li '), 'Li')
  assert.equal(surnameOf(null), undefined)
})

test('In-context view finds the paragraph around a citation sentence despite whitespace drift', () => {
  const sections = [
    {heading: 'Introduction', text: 'Opening paragraph.\n\nFrozen (Tsimpoukelli et al. 2021), Flamingo (Alayrac et al. 2022))   resort to an image-to-text\ngeneration loss, which we show is insufficient. More text follows.'},
  ]
  const found = paragraphFor('Frozen (Tsimpoukelli et al. 2021), Flamingo (Alayrac et al. 2022)) resort to an image-to-text generation loss', sections)
  assert.equal(found?.heading, 'Introduction')
  assert.ok(found?.paragraph.includes('More text follows.'))
  assert.equal(paragraphFor('A sentence that is not there at all in any section', sections), null)
  assert.equal(paragraphFor('', sections), null)
  assert.equal(squash('  a \n b\t c '), 'a b c')
})
