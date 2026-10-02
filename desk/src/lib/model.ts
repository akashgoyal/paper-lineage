// Mirrors studio/schemaTypes/shared.ts (kept as a copy so the Desk bundle doesn't pull in `sanity`).
export const PROJECT_ID = 'jd22zcim'
export const DATASET = 'production'
export const SCHEMA_ID = '_.schemas.default'

export const RELATIONS = [
  {value: 'extends', title: 'Extends', color: '#3446C4'},
  {value: 'combines', title: 'Reuses components', color: '#A35A0B'},
  {value: 'applies-to-new-domain', title: 'Applies to a new domain', color: '#3446C4'},
  {value: 'simplifies', title: 'Simplifies', color: '#4B5563'},
  {value: 'replaces', title: 'Replaces', color: '#4B5563'},
  {value: 'challenges', title: 'Challenges', color: '#A21C5B'},
  {value: 'benchmarks-against', title: 'Benchmarks against', color: '#0F766E'},
  {value: 'uses-dataset', title: 'Trained / evaluated on', color: '#4B5563'},
] as const
export type Relation = (typeof RELATIONS)[number]['value']
export const relationTitle = (r?: string | null) => RELATIONS.find((x) => x.value === r)?.title ?? r ?? ''

/** "High confidence" for one-click triage (DESIGN_SPEC §10.2): confident and cited in a Method-like section. */
export const HIGH_CONFIDENCE = 0.8

export type Decision = 'proposed' | 'accepted' | 'rejected'
export const year = (d?: string | null) => (d ? d.slice(0, 4) : '')
export const ago = (iso?: string | null) => {
  if (!iso) return ''
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  if (s < 86400) return `${Math.round(s / 3600)} h ago`
  return `${Math.round(s / 86400)} d ago`
}
