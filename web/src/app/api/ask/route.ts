// POST /api/ask: the Ask agent (DESIGN_SPEC §5.6, ARCHITECTURE §4.1).
// Claude reads Sanity through two Context MCP servers (Anthropic MCP connector) and shows evidence through
// server-validated display tools. Streams NDJSON AskEvents to the page.
import Anthropic from '@anthropic-ai/sdk'
import type {BetaContentBlockParam, BetaMessageParam, BetaToolResultBlockParam} from '@anthropic-ai/sdk/resources/beta/messages/messages'
import {z} from 'zod'
import type {AskEvent} from '@/lib/ask/cards'
import {SYSTEM_PROMPT} from '@/lib/ask/system'
import {AskContext, DISPLAY_TOOLS, recordQuestion, resolveTool, ToolInputError, type DisplayToolName} from '@/lib/ask/tools'
import {checkLimit, visitorKey} from '@/lib/ratelimit'

export const runtime = 'nodejs'
export const maxDuration = 60

const MODEL = process.env.ASK_MODEL ?? 'claude-opus-5'
const MAX_TURNS = 6
const DISPLAY = new Set(DISPLAY_TOOLS.map((t) => t.name))

const Body = z.object({
  messages: z
    .array(z.object({role: z.enum(['user', 'assistant']), content: z.string().max(4000)}))
    .min(1)
    .max(30),
})

function json(status: number, event: AskEvent) {
  return new Response(JSON.stringify(event) + '\n', {status, headers: {'content-type': 'application/x-ndjson'}})
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return json(400, {type: 'error', code: 'failed', message: 'Malformed request.'})
  const history = parsed.data.messages.slice(-12) // last 6 turns
  const question = history.at(-1)!
  if (question.role !== 'user') return json(400, {type: 'error', code: 'failed', message: 'The last message must be a question.'})
  if (question.content.length > 500) return json(400, {type: 'error', code: 'too-long', message: 'Questions are limited to 500 characters.'})

  const graphUrl = process.env.SANITY_CONTEXT_GRAPH_URL
  const papersUrl = process.env.SANITY_CONTEXT_PAPERS_URL
  const orgToken = process.env.SANITY_ORGANIZATION_TOKEN
  if (!process.env.ANTHROPIC_API_KEY || !graphUrl || !orgToken) {
    return json(503, {type: 'error', code: 'unavailable', message: 'Ask is unavailable right now. Explore and paper pages still work.'})
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip')
  const limit = await checkLimit(visitorKey(ip), 'ask')
  if (!limit.ok) {
    return json(429, {
      type: 'error',
      code: limit.reason === 'global' ? 'daily-cap' : 'rate-limited',
      message: limit.reason === 'global' ? 'Ask is resting for today (budget reached).' : 'You’ve reached the question limit.',
      retryAfterSeconds: limit.retryAfterSeconds,
    })
  }

  const anthropic = new Anthropic()
  const ctx = new AskContext()
  ctx.endpoints.add('groq')
  const mcpServers = [
    {type: 'url' as const, url: graphUrl, name: 'lineage-graph', authorization_token: orgToken},
    ...(papersUrl ? [{type: 'url' as const, url: papersUrl, name: 'lineage-papers', authorization_token: orgToken}] : []),
  ]
  const tools = [
    ...DISPLAY_TOOLS.map((t) => ({...t, eager_input_streaming: true})),
    ...mcpServers.map((s) => ({type: 'mcp_toolset' as const, mcp_server_name: s.name})),
  ]
  const messages: BetaMessageParam[] = history.map((m) => ({role: m.role, content: m.content}))

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder()
      const send = (e: AskEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + '\n'))
      const aborted = () => req.signal.aborted
      try {
        for (let turn = 0; turn < MAX_TURNS && !aborted(); turn++) {
          const response = anthropic.beta.messages.stream(
            {
              model: MODEL,
              max_tokens: 8000,
              system: [{type: 'text', text: SYSTEM_PROMPT, cache_control: {type: 'ephemeral'}}],
              messages,
              tools: tools as never,
              mcp_servers: mcpServers,
              output_config: {effort: 'medium'},
              fallbacks: 'default' as never,
              betas: ['mcp-client-2025-11-20', 'server-side-fallback-2026-07-01'],
            },
            {signal: req.signal},
          )
          for await (const event of response) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') send({type: 'text', delta: event.delta.text})
            if (event.type === 'content_block_start' && event.content_block.type === 'tool_use' && DISPLAY.has(event.content_block.name)) {
              if (!['reportOutcome', 'suggestFollowUps'].includes(event.content_block.name)) send({type: 'card-start', id: event.content_block.id, tool: event.content_block.name})
            }
            if (event.type === 'content_block_start' && event.content_block.type === 'mcp_tool_use' && event.content_block.server_name === 'lineage-papers') {
              ctx.endpoints.add('knowledge-base')
            }
          }
          const message = await response.finalMessage()
          if (message.stop_reason === 'refusal') {
            send({type: 'text', delta: 'I can’t help with that here. This site only answers questions about the papers in its dataset.'})
            ctx.outcome = ctx.outcome ?? 'unanswered'
            break
          }
          const calls = message.content.filter((b) => b.type === 'tool_use' && DISPLAY.has(b.name))
          if (message.stop_reason === 'pause_turn') {
            messages.push({role: 'assistant', content: message.content as BetaContentBlockParam[]})
            continue
          }
          if (message.stop_reason !== 'tool_use' || !calls.length) break
          if (message.stop_reason === 'tool_use' && message.content.some((b) => b.type === 'tool_use' && !DISPLAY.has(b.name))) {
            throw new Error('unexpected client tool')
          }

          const results: BetaToolResultBlockParam[] = []
          for (const call of calls) {
            if (call.type !== 'tool_use') continue
            try {
              const {card, summary} = await resolveTool(call.name as DisplayToolName, call.input, ctx)
              if (card) send({type: 'card', id: call.id, card})
              results.push({type: 'tool_result', tool_use_id: call.id, content: summary})
            } catch (err) {
              const msg = err instanceof ToolInputError ? err.message : 'Internal error resolving this card.'
              if (!(err instanceof ToolInputError)) console.error('[ask] tool failed', err)
              send({type: 'card-error', id: call.id, message: msg})
              results.push({type: 'tool_result', tool_use_id: call.id, content: msg, is_error: true})
            }
          }
          messages.push({role: 'assistant', content: message.content as BetaContentBlockParam[]}, {role: 'user', content: results})
          if (ctx.outcome) break // reportOutcome is the last call of an answer
        }
        const sources = ctx.sources()
        if (sources.papers || sources.verified || sources.unreviewed) send({type: 'sources', ...sources})
        send({type: 'outcome', outcome: ctx.outcome ?? 'answered'})
        send({type: 'done'})
      } catch (err) {
        if (!aborted()) {
          console.error('[ask] failed', err)
          send({type: 'error', code: 'failed', message: 'Something went wrong answering that.'})
        }
      } finally {
        if (!aborted()) await recordQuestion(question.content, ctx)
        controller.close()
      }
    },
  })

  return new Response(stream, {headers: {'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store'}})
}
