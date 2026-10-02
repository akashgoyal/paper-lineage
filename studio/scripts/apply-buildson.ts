// Patches concept.buildsOn on production from data/curated/concept-buildson.json without re-importing,
// so curator edits elsewhere are kept. Run from studio/: npx sanity exec scripts/apply-buildson.ts --with-user-token
import {readFileSync} from 'node:fs'
import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-02-19'})
const chains = JSON.parse(readFileSync('../data/curated/concept-buildson.json', 'utf8')) as Record<string, string[] | string>

const tx = client.transaction()
let count = 0
for (const [slug, earlier] of Object.entries(chains)) {
  if (slug.startsWith('$') || !Array.isArray(earlier)) continue
  tx.patch(`concept-${slug}`, (p) =>
    p.set({buildsOn: earlier.map((e, k) => ({_type: 'reference', _ref: `concept-${e}`, _key: `b${k}`}))}),
  )
  count++
}
const res = await tx.commit({visibility: 'async'})
console.log(`buildsOn set on ${count} concepts (transaction ${res.transactionId})`)
