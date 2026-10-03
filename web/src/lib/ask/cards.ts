// Card payloads streamed from /api/ask to the Ask page (DESIGN_SPEC §5.6). Shared by server and client.
import type {Relation} from '../sanity/types'

export type CardPaper = {_id: string; shortName: string; slug: string; year: string; title: string; kind: string}

/** A link's status as the site may show it: relation only when verified. */
export type LinkStatus =
  | {status: 'verified'; relation: Relation; mentions: number; linkId: string}
  | {status: 'cites'; mentions: number; methodMentions: number; linkId: string}
  | {status: 'none'}

export type Card =
  | {type: 'papers'; caption?: string; papers: (CardPaper & {builtOn: number; builtOnIt: number})[]}
  | {type: 'chain'; steps: {paper: CardPaper; concept?: {name: string; slug: string}}[]; links: LinkStatus[]}
  | {
      type: 'comparison'
      a: CardPaper
      b: CardPaper
      shared: {name: string; slug: string}[]
      rows: {label: string; a: string; b: string}[]
    }
  | {type: 'quote'; text: string; paper: string; section?: string; mentions?: number; via: 'knowledge-base' | 'citation'}
  | {type: 'followups'; items: string[]}
  | {type: 'storyline-draft'; title: string; draftId: string; unreviewedSteps: number}

/** Events on the NDJSON stream. */
export type AskEvent =
  | {type: 'text'; delta: string; lead?: boolean} // lead: the answer's prose, placed above the cards
  | {type: 'status'; text: string} // what the agent is doing right now (a lookup), shown while it works
  | {type: 'card-start'; id: string; tool: string}
  | {type: 'card'; id: string; card: Card}
  | {type: 'card-error'; id: string; message: string}
  | {type: 'sources'; verified: number; unreviewed: number; papers: number}
  | {type: 'outcome'; outcome: 'answered' | 'partial' | 'unanswered'}
  | {type: 'done'}
  | {type: 'error'; code: 'rate-limited' | 'daily-cap' | 'unavailable' | 'failed' | 'too-long'; message: string; retryAfterSeconds?: number}
