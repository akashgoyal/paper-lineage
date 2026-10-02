// Guard for the facts-vs-interpretation rule: no public query may select an interpretation field
// (relation / explanation / inherited) except through select(provenance.reviewDecision == "accepted" => …).
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {test} from 'node:test'

const SOURCES = ['./queries.ts', '../ask/tools.ts'].map((p) => readFileSync(new URL(p, import.meta.url), 'utf8'))

/** GROQ template strings in a source file that select an interpretation field without the gate. */
export function ungated(src: string): string[] {
  const queries = (src.match(/`[\s\S]*?`/g) ?? []).filter((q) => q.includes('*[')) // GROQ only, not prose
  return queries.filter((q) => {
    const bare = q
      .replace(/select\(provenance\.reviewDecision == "accepted" => [^)]*\)/g, '')
      .replace(/"(relation|explanation|inherited)":/g, '')
      .replace(/suggestedRelation/g, '')
    return /(^|[\s,{])(relation|explanation|inherited)\b(?!\s*:)/m.test(bare)
  })
}

test('interpretation fields are only ever projected behind the acceptance check', () => {
  for (const src of SOURCES) assert.deepEqual(ungated(src), [])
})

test('the guard catches an ungated relation, explanation or inherited projection', () => {
  assert.equal(ungated('const q = `*[_type == "influence"]{_id, relation}`').length, 1)
  assert.equal(ungated('const q = `*[_type == "influence"]{"why": explanation}`').length, 1)
  assert.equal(ungated('const q = `*[_type == "influence"]{inherited[]->{name}}`').length, 1)
  assert.equal(ungated('const q = `*[_type == "influence"]{"relation": select(provenance.reviewDecision == "accepted" => relation)}`').length, 0)
})
