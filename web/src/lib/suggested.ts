import type {PaperCard} from './sanity/types'

export type Candidate = {_id: string; name: string; slug: string; summary?: string; by: Pick<PaperCard, '_id' | 'shortName' | 'slug' | 'publishedAt'> | null}
export type SuggestedInput = {
  paper: string | null
  g1: {id: string; s: number}[]
  g2: {via: string; id: string; s: number}[]
  candidates: Candidate[]
}
export type Suggestion = Candidate & {distance: 1 | 2; strength: number}

/**
 * Same-theme concepts whose introducing paper is an ancestor (≤ 2 generations) of this concept's
 * introducing paper, strongest citation path first. A two-step path counts its weaker hop, discounted.
 */
export function suggestEarlier(input: SuggestedInput | null, limit = 3): Suggestion[] {
  if (!input?.paper) return []
  const best = new Map<string, {distance: 1 | 2; strength: number}>()
  const direct = new Map(input.g1.map((l) => [l.id, l.s]))
  for (const [id, s] of direct) best.set(id, {distance: 1, strength: s})
  for (const l of input.g2) {
    if (l.id === input.paper || best.get(l.id)?.distance === 1) continue
    const strength = Math.min(l.s, direct.get(l.via) ?? 0) / 2
    if (strength > (best.get(l.id)?.strength ?? -1)) best.set(l.id, {distance: 2, strength})
  }
  return input.candidates
    .flatMap((c) => {
      const hit = c.by && best.get(c.by._id)
      return hit ? [{...c, ...hit}] : []
    })
    .sort((a, b) => a.distance - b.distance || b.strength - a.strength || a.name.localeCompare(b.name))
    .slice(0, limit)
}
