// Client-side reducer for the /api/ask NDJSON stream (pure, unit-tested in stream.test.ts).
import type {AskEvent, Card} from '@/lib/ask/cards'

export type Part = {kind: 'text'; text: string} | {kind: 'card'; id: string; tool: string; card?: Card; error?: string}

export type Turn = {
  id: string
  question: string
  parts: Part[]
  followUps: string[]
  sources?: {verified: number; unreviewed: number; papers: number}
  outcome?: 'answered' | 'partial' | 'unanswered'
  status: 'streaming' | 'done' | 'error' | 'stopped'
  error?: {code: string; message: string; retryAfterSeconds?: number}
}

export function applyEvent(turn: Turn, e: AskEvent): Turn {
  switch (e.type) {
    case 'text': {
      const last = turn.parts.at(-1)
      if (last?.kind === 'text') return {...turn, parts: [...turn.parts.slice(0, -1), {kind: 'text', text: last.text + e.delta}]}
      return {...turn, parts: [...turn.parts, {kind: 'text', text: e.delta}]}
    }
    case 'card-start':
      return turn.parts.some((p) => p.kind === 'card' && p.id === e.id) ? turn : {...turn, parts: [...turn.parts, {kind: 'card', id: e.id, tool: e.tool}]}
    case 'card': {
      if (e.card.type === 'followups') return {...turn, followUps: e.card.items}
      const exists = turn.parts.some((p) => p.kind === 'card' && p.id === e.id)
      const part: Part = {kind: 'card', id: e.id, tool: e.card.type, card: e.card}
      return {...turn, parts: exists ? turn.parts.map((p) => (p.kind === 'card' && p.id === e.id ? part : p)) : [...turn.parts, part]}
    }
    case 'card-error':
      // A card the server refused is dropped; the model is told and usually retries with a fixed call.
      return {...turn, parts: turn.parts.filter((p) => !(p.kind === 'card' && p.id === e.id && !p.card))}
    case 'sources':
      return {...turn, sources: {verified: e.verified, unreviewed: e.unreviewed, papers: e.papers}}
    case 'outcome':
      return {...turn, outcome: e.outcome}
    case 'done':
      return {...turn, status: 'done', parts: turn.parts.filter((p) => p.kind === 'text' || p.card)}
    case 'error':
      return {...turn, status: 'error', error: {code: e.code, message: e.message, retryAfterSeconds: e.retryAfterSeconds}, parts: turn.parts.filter((p) => p.kind === 'text' || p.card)}
  }
}

/** Split an NDJSON byte stream into events; keeps any partial trailing line in `rest`. */
export function parseLines(buffer: string): {events: AskEvent[]; rest: string} {
  const lines = buffer.split('\n')
  const rest = lines.pop() ?? ''
  const events = lines.filter((l) => l.trim()).map((l) => JSON.parse(l) as AskEvent)
  return {events, rest}
}

/** Conversation history sent to the model: the questions plus the text of each answer. */
export function toHistory(turns: Turn[]) {
  return turns.flatMap((t) => {
    const answer = t.parts.filter((p) => p.kind === 'text').map((p) => (p as {text: string}).text).join('').trim()
    return answer ? [{role: 'user' as const, content: t.question}, {role: 'assistant' as const, content: answer.slice(0, 4000)}] : []
  })
}
