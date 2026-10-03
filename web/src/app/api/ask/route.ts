// POST /api/ask: the Ask agent (DESIGN_SPEC §5.6, ARCHITECTURE §4.1).
// A Together AI model reads Sanity through two Context MCP endpoints (our MCP sessions) and shows evidence
// through server-validated display tools (lib/ask/agent.ts). Streams NDJSON AskEvents to the page.
import {z} from 'zod'
import {runAgent} from '@/lib/ask/agent'
import type {AskEvent} from '@/lib/ask/cards'
import {McpSession} from '@/lib/ask/context-mcp'
import {answerSubject, type NamedPaper} from '@/lib/ask/focus'
import {client} from '@/lib/sanity/client'
import {AskContext, recordQuestion} from '@/lib/ask/tools'
import {checkLimit, visitorKey} from '@/lib/ratelimit'

export const runtime = 'nodejs'
export const maxDuration = 60

// Chosen by probing low-cost Together models on known questions (BUILD_LOG session 7): ~1¢ per answer.
const MODEL = process.env.ASK_MODEL ?? 'deepseek-ai/DeepSeek-V4-Flash-0731'

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

  const apiKey = process.env.TOGETHER_API_KEY
  const graphUrl = process.env.SANITY_CONTEXT_GRAPH_URL
  const papersUrl = process.env.SANITY_CONTEXT_PAPERS_URL
  const orgToken = process.env.SANITY_ORGANIZATION_TOKEN
  if (!apiKey || !graphUrl || !orgToken) {
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

  const ctx = new AskContext()
  ctx.endpoints.add('groq')

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder()
      const send = (e: AskEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + '\n'))
      const aborted = () => req.signal.aborted
      try {
        await runAgent(history, {
          apiKey,
          model: MODEL,
          ctx,
          send,
          signal: req.signal,
          graph: new McpSession(graphUrl, orgToken, req.signal),
          papers: papersUrl ? new McpSession(papersUrl, orgToken, req.signal) : undefined,
        })
        // The paper the answer is about: Explore opens on it ("Show in Explorer", the Explore tab).
        try {
          const all = await client.fetch<(NamedPaper & {_id: string})[]>(`*[_type == "paper"]{_id, shortName, "slug": slug.current, publishedAt}`)
          const subject = answerSubject(question.content, all, all.filter((p) => ctx.papers.has(p._id)))
          if (subject) send({type: 'focus', slug: subject.slug, name: subject.shortName})
        } catch {
          /* optional: Explore keeps its default */
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
