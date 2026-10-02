// Self-hosted runtime for paper-intake: drains queued effects and ticks instances.
// The Blueprints backend for hosted workflow runtimes isn't live yet (see @sanity/workflow-blueprint),
// and a Free-plan scheduled Function runs daily, so this runs where the curator works:
//   npm run runner           # watch mode (every 5 s)
//   npm run runner -- --once # one pass, for scripts/CI
import {handlers} from './handlers.ts'
import {engineWith, TAG, workflowsClient} from './runtime.ts'

const engine = engineWith(handlers)
const once = process.argv.includes('--once')

async function pass() {
  const ids = await workflowsClient.fetch<string[]>(
    `*[_type == "sanity.workflow.instance" && tag == "${TAG}" && !defined(completedAt) && count(pendingEffects) > 0]._id`,
  )
  for (const instanceId of ids) {
    try {
      const result = await engine.drainEffects({instanceId})
      console.log(new Date().toISOString(), instanceId, JSON.stringify(result).slice(0, 300))
    } catch (err) {
      console.error(instanceId, err instanceof Error ? err.message : err)
    }
  }
  return ids.length
}

if (once) {
  // Drain until quiet: completing one effect can cascade into the next stage's effect.
  for (let i = 0; i < 10 && (await pass()) > 0; i++);
} else {
  console.log('paper-intake runner: watching for queued effects…')
  for (;;) {
    await pass().catch((err) => console.error(err))
    await new Promise((r) => setTimeout(r, 5000))
  }
}
