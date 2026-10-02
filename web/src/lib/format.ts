import type {Relation} from './sanity/types'

export const RELATION_LABEL: Record<Relation, string> = {
  extends: 'Extends',
  combines: 'Reuses components',
  'applies-to-new-domain': 'Applies to a new domain',
  simplifies: 'Simplifies',
  replaces: 'Replaces',
  challenges: 'Challenges',
  'benchmarks-against': 'Benchmarks against',
  'uses-dataset': 'Trained / evaluated on',
}

export const RELATION_VERB: Record<Relation, string> = {
  extends: 'extends',
  combines: 'reuses components from',
  'applies-to-new-domain': 'applies to a new domain',
  simplifies: 'simplifies',
  replaces: 'replaces',
  challenges: 'challenges',
  'benchmarks-against': 'benchmarks against',
  'uses-dataset': 'trains or evaluates on',
}

export const RELATION_COLOR: Record<Relation, string> = {
  extends: 'var(--rel-extends)',
  combines: 'var(--rel-combines)',
  'applies-to-new-domain': 'var(--rel-extends)',
  simplifies: 'var(--rel-dataset)',
  replaces: 'var(--rel-dataset)',
  challenges: 'var(--rel-challenges)',
  'benchmarks-against': 'var(--rel-bench)',
  'uses-dataset': 'var(--rel-dataset)',
}

export const year = (date?: string | null) => (date ? date.slice(0, 4) : '')

export function monthYear(date?: string | null) {
  if (!date) return ''
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {month: 'short', year: 'numeric', timeZone: 'UTC'})
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`

/** First two sentences of an abstract (the summary fallback, DESIGN_SPEC §5.4). */
export function abstractLead(abstract?: string) {
  if (!abstract) return ''
  const sentences = abstract.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+(\s|$)/g) ?? [abstract]
  return sentences.slice(0, 2).join('').trim()
}

export function authorLine(authors: string[] = []) {
  // "and 1 others" reads badly: show a fourth name rather than "and 1 other".
  if (authors.length <= 4) return authors.join(', ')
  return `${authors.slice(0, 3).join(', ')} and ${authors.length - 3} others`
}
