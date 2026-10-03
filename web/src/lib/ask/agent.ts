// The Ask agent loop (DESIGN_SPEC §5.6) over an OpenAI-compatible chat API (Together AI).
// The model reaches Sanity Context through our MCP sessions (groq_query, knowledge_base_*), and shows
// evidence only through the display tools, which the server resolves and verifies (lib/ask/tools.ts).
import 'server-only'
import type {AskEvent} from './cards'
import {McpSession, type McpTool} from './context-mcp'
import {SYSTEM_PROMPT} from './system'
import {AskContext, DISPLAY_TOOLS, resolveTool, ToolInputError, type DisplayToolName} from './tools'

const API_URL = 'https://api.together.xyz/v1/chat/completions'
/** Context tools the model may call; initial_context is preloaded into the system prompt instead. */
const CONTEXT_TOOLS = {
  graph: ['groq_query'],
  papers: ['knowledge_base_search', 'knowledge_base_read'],
}
const DISPLAY = new Set<string>(DISPLAY_TOOLS.map((t) => t.name))
const SILENT_CARDS = new Set(['reportOutcome', 'suggestFollowUps']) // no skeleton card for these
const MAX_TOOL_RESULT = 12_000 // characters fed back to the model per tool call (cost + context guard)
const PRIMER_TTL = 10 * 60_000
/** Per-answer card budget, enforced here because models re-show cards in later turns. */
const CARD_LIMITS: Record<string, number> = {showQuote: 2, showChain: 2, total: 5}

type ToolCall = {
  id: string
  type: 'function'
  function: {name: string; arguments: string}
}
type Message =
  | {role: 'system' | 'user'; content: string}
  | {role: 'assistant'; content: string | null; tool_calls?: ToolCall[]}
  | {role: 'tool'; tool_call_id: string; content: string}
type FunctionTool = {
  type: 'function'
  function: {
    name: string
    description?: string
    parameters: Record<string, unknown>
  }
}

export type AgentOptions = {
  apiKey: string
  model: string
  graph: McpSession
  papers?: McpSession
  ctx: AskContext
  send: (e: AskEvent) => void
  signal?: AbortSignal
  maxTurns?: number
  maxTokens?: number
  /** Debug/probe hook: every tool call with its parsed arguments. */
  onToolCall?: (name: string, args: unknown) => void
}
export type AgentRun = {
  turns: number
  toolCalls: string[]
  usage: {prompt: number; completion: number}
  finish: string
}

// initial_context is static between Knowledge Base builds and schema deploys: fetch it once per instance.
let primer: {at: number; text: string} | null = null
async function contextPrimer(graph: McpSession, papers?: McpSession) {
  if (primer && Date.now() - primer.at < PRIMER_TTL) return primer.text
  const [g, p] = await Promise.all([graph.callTool('initial_context', {}), papers?.callTool('initial_context', {})])
  const text = [`## lineage-graph (initial context)\n${g.text.slice(0, 8000)}`, p && `## lineage-papers (initial context)\n${p.text.slice(0, 8000)}`]
    .filter(Boolean)
    .join('\n\n')
  primer = {at: Date.now(), text}
  return text
}

const NARRATION = /^(let me|let's|i'll|i will|i'm going to|now,? (i|let)|next,? (i|let)|first,? (i|let))\b/i
const wordsOf = (s: string) =>
  new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .split(' ')
      .filter((w) => w.length > 2),
  )
const similar = (a: Set<string>, b: Set<string>) => {
  const shared = [...a].filter((w) => b.has(w)).length
  return shared / (a.size + b.size - shared || 1) >= 0.6
}

/**
 * What the reader should see from one turn's text: sentences that narrate the model's own process
 * ("Let me show the chain") are dropped, and so are sentences restating one already shown
 * (models often rewrite their lead after a tool call). `seen` carries shown sentences across turns.
 */
export function forReader(text: string, seen: Set<string>[] = [], cutOff = false) {
  // Line structure (paragraphs, "- " bullets) is kept; filtering happens per sentence within each line.
  const lines = text.split('\n').map((line) => line.split(/(?<=[.!?:])\s+/).map((x) => x.trim()).filter(Boolean))
  while (lines.length && !lines.at(-1)!.length) lines.pop()
  // A turn that switched to a tool call can stop mid-sentence ("…from BLIP ("): drop the unfinished tail.
  const tail = lines.at(-1)
  if (cutOff && tail?.length && !/[.!?:)"”’*]$/.test(tail.at(-1)!)) tail.pop()
  const out = lines.map((sentences) =>
    sentences
      .filter((sentence) => {
        const plain = sentence.replace(/^[-*]\s+/, '')
        if (NARRATION.test(plain)) return false
        const words = wordsOf(plain)
        if (words.size >= 4 && seen.some((w) => similar(w, words))) return false
        seen.push(words)
        return true
      })
      .join(' '),
  )
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

const asFunction = (t: McpTool | (typeof DISPLAY_TOOLS)[number]): FunctionTool => ({
  type: 'function',
  function: {
    name: t.name,
    description: t.description,
    parameters: ('input_schema' in t ? t.input_schema : t.inputSchema) ?? {
      type: 'object',
      properties: {},
    },
  },
})

/** Reads an OpenAI-style SSE stream: text deltas go out immediately, tool calls are assembled by index. */
async function* sse(res: Response) {
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const {done, value} = await reader.read()
    if (done) break
    buffer += decoder.decode(value, {stream: true})
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const data = line.startsWith('data:') ? line.slice(5).trim() : ''
      if (!data || data === '[DONE]') continue
      yield JSON.parse(data) as {
        choices?: {
          delta?: {
            content?: string | null
            tool_calls?: {
              index: number
              id?: string
              function?: {name?: string; arguments?: string}
            }[]
          }
          finish_reason?: string | null
        }[]
        usage?: {prompt_tokens?: number; completion_tokens?: number}
      }
    }
  }
}

export async function runAgent(history: {role: 'user' | 'assistant'; content: string}[], o: AgentOptions): Promise<AgentRun> {
  const [graphTools, paperTools, primerText] = await Promise.all([o.graph.listTools(), o.papers?.listTools() ?? [], contextPrimer(o.graph, o.papers)])
  const route = new Map<string, McpSession>()
  for (const t of graphTools) if (CONTEXT_TOOLS.graph.includes(t.name)) route.set(t.name, o.graph)
  for (const t of paperTools) if (o.papers && CONTEXT_TOOLS.papers.includes(t.name)) route.set(t.name, o.papers)
  const tools = [...[...graphTools, ...paperTools].filter((t) => route.has(t.name)).map(asFunction), ...DISPLAY_TOOLS.map(asFunction)]

  const messages: Message[] = [{role: 'system', content: `${SYSTEM_PROMPT}\n\n${primerText}`}, ...history]
  const run: AgentRun = {
    turns: 0,
    toolCalls: [],
    usage: {prompt: 0, completion: 0},
    finish: '',
  }

  const maxTurns = o.maxTurns ?? 8
  let wrote = false
  let nudged = false
  // Models rewrite their lead on every turn. Keep only the final version and send it once, as the lead.
  let lead = ''
  const shown = new Set<string>() // tool + canonical args of cards already on screen
  const counts: Record<string, number> = {total: 0}
  for (; run.turns < maxTurns && !o.signal?.aborted; run.turns++) {
    // Last turn: display tools only, so the model presents what it found instead of looking further.
    const last = run.turns === maxTurns - 1
    const request = () =>
      fetch(API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${o.apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: o.model,
          messages: last
            ? [
                ...messages,
                {
                  role: 'user',
                  content: 'Present the answer now with the display tools, then call suggestFollowUps and reportOutcome.',
                },
              ]
            : messages,
          tools: last ? tools.filter((t) => DISPLAY.has(t.function.name)) : tools,
          tool_choice: 'auto',
          stream: true,
          stream_options: {include_usage: true},
          // Reasoning models spend output tokens thinking before they answer; 2,000 was sometimes all used up.
          max_tokens: o.maxTokens ?? 6000,
          temperature: 0.2,
        }),
        signal: o.signal,
      })

    let text = ''
    let calls: ToolCall[] = []
    // One retry when the connection drops mid-stream ("terminated"); nothing from the turn has been shown yet.
    for (let attempt = 0; ; attempt++) {
      try {
        text = ''
        calls = []
        await readTurn(await request())
        break
      } catch (err) {
        if (attempt > 0 || o.signal?.aborted || !(err instanceof TypeError)) throw err
      }
    }

    async function readTurn(res: Response) {
      if (!res.ok) throw new Error(`Together ${res.status}: ${(await res.text()).slice(0, 300)}`)
      for await (const chunk of sse(res)) {
        if (chunk.usage) {
          run.usage.prompt += chunk.usage.prompt_tokens ?? 0
          run.usage.completion += chunk.usage.completion_tokens ?? 0
        }
        const choice = chunk.choices?.[0]
        if (choice?.finish_reason) run.finish = choice.finish_reason
        const delta = choice?.delta
        // Text is held until the turn ends: a turn that only looks things up tends to narrate ("Let me check…"),
        // which the reader shouldn't see. Answer turns (no lookups) are flushed as a whole.
        if (delta?.content) text += delta.content
        for (const d of delta?.tool_calls ?? []) {
          const call = (calls[d.index] ??= {
            id: '',
            type: 'function',
            function: {name: '', arguments: ''},
          })
          if (d.id) call.id = d.id
          if (d.function?.name) {
            call.function.name += d.function.name
            call.id ||= `call_${run.turns}_${d.index}`
            if (DISPLAY.has(call.function.name) && !SILENT_CARDS.has(call.function.name))
              o.send({
                type: 'card-start',
                id: call.id,
                tool: call.function.name,
              })
          }
          if (d.function?.arguments) call.function.arguments += d.function.arguments
        }
      }
    }

    const made = calls.filter(Boolean)
    const lookup = made.some((c) => !DISPLAY.has(c.function.name))
    const prose = lookup ? '' : forReader(text, [], made.length > 0)
    if (prose) {
      lead = prose
      wrote = true
    }
    if (!made.length) {
      // Cut off with nothing usable (often all reasoning): ask once for a short answer instead of ending blank.
      if (run.finish === 'length' && !prose && !nudged) {
        nudged = true
        messages.push({role: 'user', content: 'Your last reply was cut off. Answer briefly now: a 1–3 sentence lead, then the display tools.'})
        continue
      }
      break
    }
    messages.push({
      role: 'assistant',
      content: text || null,
      tool_calls: made,
    })

    for (const call of made) {
      const name = call.function.name
      run.toolCalls.push(name)
      let args: unknown
      try {
        args = JSON.parse(call.function.arguments || '{}')
      } catch {
        if (DISPLAY.has(name))
          o.send({
            type: 'card-error',
            id: call.id,
            message: 'Malformed tool input.',
          })
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: 'Error: the arguments were not valid JSON. Call the tool again with a valid JSON object.',
        })
        continue
      }
      o.onToolCall?.(name, args)
      if (DISPLAY.has(name)) {
        const key = `${name}:${JSON.stringify(args)}`
        const isCard = !SILENT_CARDS.has(name)
        const refusal = shown.has(key)
          ? 'Already shown. Do not repeat cards; continue or finish the answer.'
          : isCard && (counts[name] ?? 0) >= (CARD_LIMITS[name] ?? Infinity)
            ? `At most ${CARD_LIMITS[name]} ${name} cards per answer. Finish the answer.`
            : isCard && counts.total >= CARD_LIMITS.total
              ? 'The answer has enough cards. Call suggestFollowUps and reportOutcome now.'
              : null
        if (refusal) {
          o.send({type: 'card-error', id: call.id, message: refusal})
          messages.push({role: 'tool', tool_call_id: call.id, content: refusal})
          continue
        }
        try {
          const {card, summary} = await resolveTool(name as DisplayToolName, args, o.ctx)
          if (card) o.send({type: 'card', id: call.id, card})
          shown.add(key)
          if (isCard) {
            counts[name] = (counts[name] ?? 0) + 1
            counts.total++
          }
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: summary,
          })
        } catch (err) {
          const msg = err instanceof ToolInputError ? err.message : 'Internal error resolving this card.'
          if (!(err instanceof ToolInputError)) console.error('[ask] display tool failed', err)
          o.send({type: 'card-error', id: call.id, message: msg})
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: `Error: ${msg}`,
          })
        }
      } else if (route.has(name)) {
        if (route.get(name) === o.papers) o.ctx.endpoints.add('knowledge-base')
        const {text: result} = await route.get(name)!.callTool(name, args)
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: result.length > MAX_TOOL_RESULT ? `${result.slice(0, MAX_TOOL_RESULT)}\n…(truncated; narrow the query)` : result,
        })
      } else {
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: `Error: unknown tool "${name}".`,
        })
      }
    }
    // reportOutcome is the last call of an answer; follow-ups are the second-to-last, so stop there too.
    if (o.ctx.outcome || run.toolCalls.includes('suggestFollowUps')) break
  }
  // Models sometimes stop without reporting. Infer it the way rule 7 defines it: unverified evidence is "partial".
  if (lead) o.send({type: 'text', delta: lead, lead: true})
  if (!wrote && !counts.total && !o.signal?.aborted) {
    o.send({type: 'text', delta: 'I couldn’t put an answer together this time. Try rephrasing the question, or open the paper pages directly.'})
  }
  if (!o.ctx.outcome) {
    const {verified, unreviewed, papers} = o.ctx.sources()
    o.ctx.outcome = !wrote && !counts.total && !papers ? 'unanswered' : verified === 0 && unreviewed > 0 ? 'partial' : 'answered'
  }
  return run
}
