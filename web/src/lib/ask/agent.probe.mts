// Model probe: runs the real Ask loop (no question is saved) and reports tool use, cards, text and cost.
// node --env-file=.env.local --conditions=react-server --import tsx src/lib/ask/agent.probe.mts <model> "<question>"
import {runAgent} from './agent.ts'
import {McpSession} from './context-mcp.ts'
import {AskContext} from './tools.ts'

const args = process.argv.slice(2).filter((a) => a !== '--trace')
const trace = process.argv.includes('--trace') // print every tool call with its arguments
const [model, question = "Where did BLIP-2's Q-Former come from?"] = args
const PRICE: Record<string, [number, number]> = {
  'openai/gpt-oss-20b': [0.05, 0.2], 'deepseek-ai/DeepSeek-V4-Flash-0731': [0.14, 0.28], 'Qwen/Qwen3.5-9B': [0.17, 0.25],
  'zai-org/GLM-5.3-Flash': [0.15, 0.5], 'openai/gpt-oss-120b': [0.15, 0.6], 'google/gemma-4-31B-it': [0.39, 0.97],
}
const env = process.env
const ctx = new AskContext()
const cards: string[] = []
let text = ''
const t0 = Date.now()
try {
  const run = await runAgent([{role: 'user', content: question}], {
    apiKey: env.TOGETHER_API_KEY!, model, ctx,
    graph: new McpSession(env.SANITY_CONTEXT_GRAPH_URL!, env.SANITY_ORGANIZATION_TOKEN!),
    papers: new McpSession(env.SANITY_CONTEXT_PAPERS_URL!, env.SANITY_ORGANIZATION_TOKEN!),
    onToolCall: (name, input) => trace && console.log(`→ ${name} ${JSON.stringify(input)}`),
    send: (e) => {
      if (e.type === 'text') text += e.delta
      if (e.type === 'card') cards.push(e.card.type)
      if (e.type === 'card-error') cards.push(`✖(${e.message.slice(0, 70)})`)
    },
  })
  const [pi, po] = PRICE[model] ?? [0, 0]
  console.log(JSON.stringify({model, secs: Math.round((Date.now() - t0) / 1000), turns: run.turns, finish: run.finish, tools: run.toolCalls, cards, outcome: ctx.outcome, sources: ctx.sources(), usd: +((run.usage.prompt * pi + run.usage.completion * po) / 1e6).toFixed(5), tokens: run.usage}))
  console.log('TEXT:', text.replace(/\s+/g, ' ').slice(0, 700))
} catch (err) {
  console.log(JSON.stringify({model, error: String(err).slice(0, 300)}))
}
