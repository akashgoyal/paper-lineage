import assert from 'node:assert/strict'
import {test} from 'node:test'
import {forReader} from './agent.ts'

test('narration about the model’s own process is dropped, the answer stays', () => {
  assert.equal(forReader('The Q-Former is BLIP-2’s own module. Let me show the lineage chain'), 'The Q-Former is BLIP-2’s own module.')
  assert.equal(forReader("I'll look that up.\nBLIP (2022) cites ALBEF 4 times."), 'BLIP (2022) cites ALBEF 4 times.')
  assert.equal(forReader('Now let me pull the quote:'), '')
  assert.equal(forReader('Letting the queries attend is the key idea.'), 'Letting the queries attend is the key idea.')
})

test('a restated lead is dropped across turns, new information is kept', () => {
  const seen: Set<string>[] = []
  forReader("The Q-Former is BLIP-2's own invention, built on Flamingo's Perceiver resampler and BLIP's encoder.", seen)
  const second = forReader(
    "The Q-Former is BLIP-2's own design, built on Flamingo's Perceiver resampler and BLIP's encoder. It uses 32 learned queries to read a frozen image encoder.",
    seen,
  )
  assert.equal(second, 'It uses 32 learned queries to read a frozen image encoder.')
})

test('paragraphs and bullets survive filtering', () => {
  assert.equal(forReader('The queries do three things:\n- **Cross-attention** to image features.\n- Self-attention among queries.'), 'The queries do three things:\n- **Cross-attention** to image features.\n- Self-attention among queries.')
  assert.equal(forReader('BLIP-2 freezes both models. It trains only the Q-Former. Then from BLIP (', [], true), 'BLIP-2 freezes both models. It trains only the Q-Former.')
})
