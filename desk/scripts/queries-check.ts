// Runs every Desk query against production with the curator's token (drafts perspective, like the SDK).
// Run: npx sanity exec scripts/queries-check.ts --with-user-token
import {getCliClient} from 'sanity/cli'
import {ACTIVITY, EDGE_PROJECTION, GAP, GAPS, HEADER, HOOD, PIPELINE, QUESTIONS, QUEUE, STORIES, STORY_PROJECTION} from '../src/lib/queries'

const client = getCliClient({apiVersion: '2025-02-19', projectId: 'jd22zcim', dataset: 'production'}).withConfig({useCdn: false, perspective: 'drafts'})
const BLIP2 = 'paper-2301-12597'
let failed = 0

async function check(name: string, query: string, params: Record<string, unknown> = {}, perspective: 'drafts' | 'raw' = 'drafts') {
  try {
    const res = await client.withConfig({perspective}).fetch(query, params)
    const size = Array.isArray(res) ? `${res.length} rows; first ` : ''
    console.log(`✔ ${name.padEnd(10)} ${size}${JSON.stringify(Array.isArray(res) ? res[0] : res)?.slice(0, 200)}`)
    return res
  } catch (err) {
    failed++
    console.log(`✖ ${name.padEnd(10)} ${(err as {details?: {description?: string}}).details?.description ?? err}`)
  }
}

await check('QUEUE', QUEUE)
await check('HEADER', HEADER, {id: BLIP2, high: 0.8})
await check('EDGE', `*[_type == "influence" && to._ref == $id][0]${EDGE_PROJECTION}`, {id: BLIP2})
await check('HOOD', HOOD, {id: BLIP2})
await check('ACTIVITY', ACTIVITY)
const gaps = await check('GAPS', GAPS, {statuses: ['open', 'in-progress']})
await check('GAP', GAP, {id: gaps?.[0]?._id ?? 'none'})
await check('QUESTIONS', QUESTIONS)
await check('STORIES', STORIES)
await check('STORY', `*[_type == "storyline"][0]${STORY_PROJECTION}`)
await check('PIPELINE', PIPELINE, {}, 'raw')
process.exit(failed ? 1 : 0)
