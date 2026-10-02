// Every public GROQ query. Rule (ARCHITECTURE §5, DESIGN_SPEC §4): a link's interpretation
// (relation, explanation, inherited concepts) is projected ONLY when it has been accepted.
// Never select `relation` directly in this file; use LINK_FIELDS. Checked by lib/sanity/queries.test.ts.

export const LINK_FIELDS = `
  _id,
  "mentions": coalesce(citation.mentions, 0),
  "methodMentions": coalesce(citation.methodMentions, 0),
  "decision": provenance.reviewDecision,
  "relation": select(provenance.reviewDecision == "accepted" => relation),
  "explanation": select(provenance.reviewDecision == "accepted" => explanation),
  "inherited": select(provenance.reviewDecision == "accepted" => inherited[]->{name, "slug": slug.current}),
  "evidence": coalesce(citation.contexts[_key == ^.evidenceKey][0], citation.contexts[0]){section, text}
`

const PAPER_CARD = `_id, title, shortName, "slug": slug.current, publishedAt, kind, arxivId`

export const STATS_QUERY = `{
  "papers": count(*[_type == "paper"]),
  "links": count(*[_type == "influence"]),
  "accepted": count(*[_type == "influence" && provenance.reviewDecision == "accepted"]),
  "concepts": count(*[_type == "concept" && level == "concept"]),
  "themes": count(*[_type == "concept" && level == "theme"]),
  "stories": count(*[_type == "storyline"])
}`

export const SITE_QUERY = `*[_id == "siteSettings"][0]{
  heroTitle, heroDek, examplePrompts,
  "startPapers": startPapers[]->{${PAPER_CARD}, "descendants": count(*[_type == "influence" && from._ref == ^._id])}
}`

export const PAPER_SLUGS_QUERY = `*[_type == "paper" && defined(slug.current)].slug.current`

export const PAPER_QUERY = `*[_type == "paper" && slug.current == $slug][0]{
  ${PAPER_CARD}, authors, abstract, summary, primaryCategory,
  "harvest": harvest{fullTextSource, referenceCount, depth},
  "introduces": *[_type == "concept" && introducedBy._ref == ^._id]{name, "slug": slug.current, "theme": broader->name} | order(name asc),
  "uses": uses[]->{name, "slug": slug.current, "theme": broader->name},
  "builtOn": *[_type == "influence" && to._ref == ^._id]{${LINK_FIELDS}, "paper": from->{${PAPER_CARD}}} | order(methodMentions desc, mentions desc),
  "ledTo": *[_type == "influence" && from._ref == ^._id]{${LINK_FIELDS}, "paper": to->{${PAPER_CARD}}} | order(paper.publishedAt asc)
}`

export const CONCEPT_SLUGS_QUERY = `*[_type == "concept" && defined(slug.current)].slug.current`

// buildsOn is followed 6 levels deep (GROQ can't recurse); the page flattens it into a chain.
const evolution = (depth: number): string =>
  `_id, name, "slug": slug.current, summary, "by": introducedBy->{${PAPER_CARD}}` +
  (depth > 0 ? `, "buildsOn": buildsOn[]->{${evolution(depth - 1)}}` : '')

export const CONCEPT_QUERY = `*[_type == "concept" && slug.current == $slug][0]{
  ${evolution(6)}, level, category, aliases,
  "theme": broader->{name, "slug": slug.current},
  "siblings": *[_type == "concept" && broader._ref == ^.broader._ref && _id != ^._id]{name, "slug": slug.current, "by": introducedBy->shortName} | order(name asc),
  "usedBy": *[_type == "paper" && references(^._id) && _id != ^.introducedBy._ref]{${PAPER_CARD}} | order(publishedAt asc)
}`

/** Links between two sets of papers, used to colour the connectors of a concept's evolution chain. */
export const LINKS_BETWEEN_QUERY = `*[_type == "influence" && from._ref in $ids && to._ref in $ids]{
  "from": from._ref, "to": to._ref, ${LINK_FIELDS}
}`

export const THEMES_QUERY = `*[_type == "concept" && level == "theme"]{
  name, "slug": slug.current, summary,
  "concepts": count(*[_type == "concept" && broader._ref == ^._id])
} | order(name asc)`

export const THEME_QUERY = `*[_type == "concept" && level == "theme" && slug.current == $slug][0]{
  name, "slug": slug.current, summary,
  "concepts": *[_type == "concept" && broader._ref == ^._id]{
    name, "slug": slug.current, summary,
    "by": introducedBy->{shortName, "slug": slug.current, publishedAt},
    "users": *[_type == "paper" && references(^._id)]{publishedAt}
  }
}`

/** The whole public lineage graph (≈200 papers, ≈1,350 links): small enough to fetch once and lay out in the browser. */
export const GRAPH_QUERY = `{
  "papers": *[_type == "paper"]{_id, shortName, "slug": slug.current, publishedAt, kind, title},
  "links": *[_type == "influence"]{"from": from._ref, "to": to._ref, _id, "mentions": coalesce(citation.mentions, 0), "methodMentions": coalesce(citation.methodMentions, 0), "decision": provenance.reviewDecision, "relation": select(provenance.reviewDecision == "accepted" => relation)}
}`

/** One link in full, loaded when the Explorer inspector selects it. */
export const LINK_QUERY = `*[_type == "influence" && _id == $id][0]{${LINK_FIELDS}, "from": from->{shortName, "slug": slug.current}, "to": to->{shortName, "slug": slug.current}}`

export const PIPELINE_QUERY = `{
  "recent": *[_type == "influence" && provenance.reviewDecision == "accepted"] | order(provenance.reviewedAt desc)[0...10]{
    ${LINK_FIELDS}, "from": from->{shortName, "slug": slug.current}, "to": to->{shortName, "slug": slug.current},
    "reviewedAt": provenance.reviewedAt
  },
  "gaps": count(*[_type == "gap" && status in ["open", "in-progress"]])
}`

export const STORIES_QUERY = `*[_type == "storyline"] | order(_updatedAt desc){
  title, "slug": slug.current, dek, "steps": count(steps)
}`

export const SEARCH_QUERY = `{
  "papers": *[_type == "paper" && (shortName match $q || title match $q)] | order(publishedAt desc)[0...8]{shortName, "slug": slug.current, publishedAt},
  "concepts": *[_type == "concept" && level == "concept" && (name match $q || aliases[] match $q)][0...8]{name, "slug": slug.current, "theme": broader->name},
  "themes": *[_type == "concept" && level == "theme" && name match $q][0...8]{name, "slug": slug.current}
}`

/** Light paper/concept summaries for the Ask side panel (fetched in the browser). */
export const PANEL_PAPER_QUERY = `*[_type == "paper" && slug.current == $slug][0]{
  ${PAPER_CARD}, authors, abstract, summary,
  "introduces": *[_type == "concept" && introducedBy._ref == ^._id]{name, "slug": slug.current, "theme": broader->name},
  "builtOn": *[_type == "influence" && to._ref == ^._id] | order(citation.methodMentions desc, citation.mentions desc){"name": from->shortName},
  "builtOnIt": *[_type == "influence" && from._ref == ^._id] | order(citation.methodMentions desc){"name": to->shortName}
}`

export const PANEL_CONCEPT_QUERY = `*[_type == "concept" && slug.current == $slug][0]{
  name, "slug": slug.current, summary, "theme": broader->name,
  "by": introducedBy->{shortName, "slug": slug.current, publishedAt},
  "buildsOn": buildsOn[]->{name, "slug": slug.current, "by": introducedBy->shortName}
}`

export const STORY_SLUGS_QUERY = `*[_type == "storyline" && defined(slug.current)].slug.current`

const RICH_TEXT = `[]{
  ...,
  markDefs[]{
    ...,
    _type == "paperMention" => {"href": "/paper/" + paper->slug.current, "label": paper->shortName},
    _type == "conceptMention" => {"href": "/concept/" + concept->slug.current, "label": concept->name},
    _type == "linkMention" => {"href": "/explore?focus=" + influence->to->slug.current, "label": influence->from->shortName + " → " + influence->to->shortName}
  }
}`

export const STORY_QUERY = `*[_type == "storyline" && slug.current == $slug][0]{
  title, "slug": slug.current, dek, _updatedAt,
  "intro": intro${RICH_TEXT},
  "steps": steps[defined(influence)]{
    _key,
    "narrative": narrative${RICH_TEXT},
    "link": influence->{${LINK_FIELDS}, "from": from->{${PAPER_CARD}}, "to": to->{${PAPER_CARD}}}
  }
}`

export const SITEMAP_QUERY = `{
  "papers": *[_type == "paper" && defined(slug.current)]{"slug": slug.current, _updatedAt},
  "concepts": *[_type == "concept" && level == "concept" && defined(slug.current)]{"slug": slug.current, _updatedAt},
  "themes": *[_type == "concept" && level == "theme" && defined(slug.current)]{"slug": slug.current, _updatedAt},
  "stories": *[_type == "storyline" && defined(slug.current)]{"slug": slug.current, _updatedAt}
}`

export const OG_PAPER_QUERY = `*[_type == "paper" && slug.current == $slug][0]{
  shortName, title, publishedAt, authors,
  "builtOn": count(*[_type == "influence" && to._ref == ^._id]),
  "ledTo": count(*[_type == "influence" && from._ref == ^._id]),
  "verified": count(*[_type == "influence" && to._ref == ^._id && provenance.reviewDecision == "accepted"])
}`
