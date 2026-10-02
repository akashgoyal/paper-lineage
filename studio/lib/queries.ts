// GROQ used by the Studio views; shared with scripts/sanity-checks.ts so the checks run the real queries.

export const PAPER_LINEAGE_QUERY = `{
  "paper": *[_id == $id][0]{shortName, publishedAt},
  "builtOn": *[_type == "influence" && to._ref == $id]{
    _id, "paper": from->{shortName, publishedAt}, relation, "decision": provenance.reviewDecision,
    "mentions": citation.mentions, "method": citation.methodMentions
  } | order(method desc, mentions desc),
  "ledTo": *[_type == "influence" && from._ref == $id]{
    _id, "paper": to->{shortName, publishedAt}, relation, "decision": provenance.reviewDecision,
    "mentions": citation.mentions, "method": citation.methodMentions
  } | order(method desc, mentions desc),
  "grandparents": count(array::unique(*[_type == "influence" && to._ref in *[_type == "influence" && to._ref == $id].from._ref].from._ref))
}`

export const PAPER_SOURCE_QUERY = `*[_type == "paperText" && paper._ref == $id][0]{source, sections}`

export const LINK_CONTEXT_QUERY = `*[_id == $id][0]{
  "from": from->{shortName, "author": authors[0]},
  "to": to->{shortName},
  "contexts": citation.contexts,
  evidenceKey,
  "sections": *[_type == "paperText" && paper._ref == ^.to._ref][0].sections[]{heading, text}
}`

// Follow buildsOn up to 6 levels (DESIGN_SPEC §6.5). GROQ can't recurse, so the projection is nested.
const evolutionLevel = (depth: number): string =>
  depth === 0
    ? `_id, name, "by": introducedBy->{_id, shortName, "year": string::split(publishedAt, "-")[0]}`
    : `_id, name, "by": introducedBy->{_id, shortName, "year": string::split(publishedAt, "-")[0]}, "buildsOn": buildsOn[]->{${evolutionLevel(depth - 1)}}`

export const CONCEPT_EVOLUTION_QUERY = `{
  "root": *[_id == $id][0]{${evolutionLevel(6)}},
  "links": *[_type == "influence"]{"from": from._ref, "to": to._ref, relation, "decision": provenance.reviewDecision, "mentions": citation.mentions}
}`

// The public projection rule (ARCHITECTURE §5, DESIGN_SPEC §4): interpretation only once accepted.
export const PUBLIC_LINK_PROJECTION = `{
  _id,
  "mentions": citation.mentions,
  "relation": select(provenance.reviewDecision == "accepted" => relation),
  "explanation": select(provenance.reviewDecision == "accepted" => explanation),
  "inherited": select(provenance.reviewDecision == "accepted" => inherited[]->name)
}`
