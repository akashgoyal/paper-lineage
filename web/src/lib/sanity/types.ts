// Shapes returned by lib/sanity/queries.ts (hand-written; kept next to the queries they describe).

export type Relation =
  | 'extends'
  | 'combines'
  | 'applies-to-new-domain'
  | 'simplifies'
  | 'replaces'
  | 'challenges'
  | 'benchmarks-against'
  | 'uses-dataset'

export type PaperCard = {
  _id: string
  title: string
  shortName: string
  slug: string
  publishedAt: string
  kind: 'method' | 'dataset' | 'benchmark' | 'analysis'
  arxivId: string
}

export type ConceptRef = {name: string; slug: string; theme?: string}

export type LinkFields = {
  _id: string
  mentions: number
  methodMentions: number
  decision: 'proposed' | 'accepted' | 'rejected'
  relation: Relation | null
  explanation: string | null
  inherited: {name: string; slug: string}[] | null
  evidence: {section?: string; text?: string} | null
}

export type Stats = {papers: number; links: number; accepted: number; concepts: number; themes: number; stories: number}

export type SiteSettings = {
  heroTitle?: string
  heroDek?: string
  examplePrompts?: string[]
  startPapers?: (PaperCard & {descendants: number})[]
}

export type Paper = PaperCard & {
  authors: string[]
  abstract: string
  summary?: string
  primaryCategory?: string
  harvest?: {fullTextSource?: string; referenceCount?: number; depth?: number}
  introduces: ConceptRef[]
  uses: ConceptRef[] | null
  builtOn: (LinkFields & {paper: PaperCard})[]
  ledTo: (LinkFields & {paper: PaperCard})[]
}

export type EvolutionNode = {
  _id: string
  name: string
  slug: string
  summary: string
  by: PaperCard | null
  buildsOn?: EvolutionNode[] | null
}

export type Concept = EvolutionNode & {
  level: 'theme' | 'concept'
  category: string
  aliases?: string[]
  theme: {name: string; slug: string} | null
  siblings: {name: string; slug: string; by?: string}[]
  usedBy: PaperCard[]
}

export type GraphPaper = {_id: string; shortName: string; slug: string; publishedAt: string; kind: PaperCard['kind']; title: string}
export type GraphLink = Pick<LinkFields, '_id' | 'mentions' | 'methodMentions' | 'decision' | 'relation'> & {from: string; to: string}
