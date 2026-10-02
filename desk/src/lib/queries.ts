// Every GROQ query the Desk runs, in one JSX-free module so scripts/queries-check.ts can run them too.

// Flagged first (any low-confidence link), then the most Method citations, then the most left to review.
export const QUEUE = `*[_type == "paper"]{
  _id, shortName, publishedAt,
  "left": count(*[_type == "influence" && to._ref == ^._id && provenance.reviewDecision == "proposed"]),
  "low": count(*[_type == "influence" && to._ref == ^._id && provenance.reviewDecision == "proposed" && provenance.confidence < 0.5]),
  "method": count(*[_type == "influence" && to._ref == ^._id && provenance.reviewDecision == "proposed" && citation.methodMentions > 0])
}{..., "flagged": low > 0}[left > 0] | order(flagged desc, method desc, left desc)`

export const HEADER = `*[_id == $id][0]{
  shortName, publishedAt,
  "total": count(*[_type == "influence" && to._ref == ^._id]),
  "accepted": count(*[_type == "influence" && to._ref == ^._id && provenance.reviewDecision == "accepted"]),
  "left": count(*[_type == "influence" && to._ref == ^._id && provenance.reviewDecision == "proposed"]),
  "high": *[_type == "influence" && to._ref == ^._id && provenance.reviewDecision == "proposed"
            && provenance.confidence >= $high && citation.methodMentions > 0 && defined(coalesce(relation, provenance.suggestedRelation))]{
    "_id": string::split(_id, "drafts.")[-1], relation, "suggested": provenance.suggestedRelation, "from": from->shortName
  }
}`

export const HOOD = `*[_id == $id][0]{
  shortName,
  "incoming": *[_type == "influence" && to._ref == ^._id && provenance.reviewDecision != "rejected"] | order(citation.methodMentions desc)[0...12]{
    _id, "from": from->shortName, "decision": provenance.reviewDecision, relation
  },
  "outgoing": *[_type == "influence" && from._ref == ^._id && provenance.reviewDecision != "rejected"] | order(citation.mentions desc)[0...6]{
    _id, "to": to->shortName, "decision": provenance.reviewDecision
  }
}`

export const ACTIVITY = `*[_type == "influence" && defined(provenance.reviewedAt)] | order(provenance.reviewedAt desc)[0...10]{
  _id, "from": from->shortName, "to": to->shortName, "decision": provenance.reviewDecision, "by": provenance.reviewedBy, "at": provenance.reviewedAt
}`

export const GAPS = `*[_type == "gap" && status in $statuses] | order(questionCount desc, _updatedAt desc){_id, kind, title, status, "questionCount": coalesce(questionCount, 0)}`

export const GAP = `*[_id == $id][0]{
  _id, kind, title, status, detail, resolution, suggestedArxivIds, "questionCount": coalesce(questionCount, 0),
  "papers": papers[]->{_id, shortName},
  "questions": *[_type == "question" && gap._ref == ^._id] | order(askedAt desc)[0...3]{_id, text, outcome, askedAt},
  "existing": *[_type == "paper" && arxivId in coalesce(^.suggestedArxivIds, [])]{arxivId, _id}
}`

export const QUESTIONS = `*[_type == "question"] | order(askedAt desc)[0...20]{_id, text, outcome, askedAt}`

// The Desk reads with the drafts perspective, so _originalId tells drafts apart.
export const STORIES = `*[_type == "storyline"]{
  "_id": string::split(_originalId, "drafts.")[-1], title, origin, "steps": count(steps), _updatedAt,
  "draft": _originalId in path("drafts.**"),
  "published": count(*[_id == string::split(^._originalId, "drafts.")[-1]]) > 0
} | order(draft desc, _updatedAt desc)`

export const STORY_PROJECTION = `{
  title, slug,
  "raw": steps,
  "steps": steps[]{
    _key, "linkId": influence._ref,
    "from": influence->from->shortName, "fromYear": influence->from->publishedAt,
    "to": influence->to->shortName, "decision": influence->provenance.reviewDecision, "relation": influence->relation
  }
}`

// Raw perspective: drafts and published are counted separately, which is what the pipeline is about.
export const PIPELINE = `{
  "papers": count(*[_type == "paper" && !(_id in path("drafts.**"))]),
  "links": {
    "proposed": count(*[_type == "influence" && !(_id in path("drafts.**")) && provenance.reviewDecision == "proposed"]),
    "accepted": count(*[_type == "influence" && !(_id in path("drafts.**")) && provenance.reviewDecision == "accepted"]),
    "rejected": count(*[_type == "influence" && !(_id in path("drafts.**")) && provenance.reviewDecision == "rejected"]),
    "drafts": count(*[_type == "influence" && _id in path("drafts.**")])
  },
  "method": count(*[_type == "influence" && !(_id in path("drafts.**")) && provenance.reviewDecision == "proposed" && citation.methodMentions > 0]),
  "high": count(*[_type == "influence" && !(_id in path("drafts.**")) && provenance.reviewDecision == "proposed" && provenance.confidence >= 0.8 && citation.methodMentions > 0]),
  "gaps": {"open": count(*[_type == "gap" && status == "open"]), "progress": count(*[_type == "gap" && status == "in-progress"])},
  "questions": {
    "total": count(*[_type == "question"]),
    "unanswered": count(*[_type == "question" && outcome == "unanswered"]),
    "partial": count(*[_type == "question" && outcome == "partial"])
  },
  "storylines": {"published": count(*[_type == "storyline" && !(_id in path("drafts.**"))]), "drafts": count(*[_type == "storyline" && _id in path("drafts.**")])},
  "intake": *[_type == "paper" && _id in path("drafts.**") && count(*[_id == string::split(^._id, "drafts.")[-1]]) == 0] | order(_updatedAt desc)[0...10]{_id, shortName, arxivId, _updatedAt},
  "recent": *[_type == "influence" && !(_id in path("drafts.**")) && defined(provenance.reviewedAt)] | order(provenance.reviewedAt desc)[0...15]{
    _id, "from": from->shortName, "to": to->shortName, "decision": provenance.reviewDecision, relation, "by": provenance.reviewedBy, "at": provenance.reviewedAt
  }
}`

export const EDGE_PROJECTION = `{
  _id, relation, explanation, evidenceKey,
  "from": from->{shortName, publishedAt, authors},
  "to": to->{shortName},
  "decision": coalesce(provenance.reviewDecision, "proposed"),
  "suggested": provenance.suggestedRelation,
  "origin": provenance.origin,
  "confidence": provenance.confidence,
  "mentions": citation.mentions,
  "methodMentions": citation.methodMentions,
  "contexts": citation.contexts
}`
