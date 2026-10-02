import type {DocumentBadgeComponent} from 'sanity'

type Doc = {origin?: string; harvest?: {origin?: string}; provenance?: {origin?: string; reviewDecision?: string}}

const ORIGIN_LABEL: Record<string, string> = {harvest: 'Harvest', ai: 'AI', curator: 'Curator'}

export const OriginBadge: DocumentBadgeComponent = ({draft, published}) => {
  const doc = (draft ?? published) as Doc | null
  const origin = doc?.provenance?.origin ?? doc?.origin ?? doc?.harvest?.origin
  return origin ? {label: ORIGIN_LABEL[origin] ?? origin, title: `Origin: ${origin}`, color: origin === 'curator' ? 'success' : 'warning'} : null
}

export const ReviewBadge: DocumentBadgeComponent = ({draft, published}) => {
  const decision = ((draft ?? published) as Doc | null)?.provenance?.reviewDecision
  if (decision === 'accepted') return {label: 'Verified', color: 'success'}
  if (decision === 'rejected') return {label: 'Rejected', color: 'danger'}
  return {label: 'Unreviewed', color: 'warning', title: 'Citation fact only; relation hidden on the site until accepted'}
}
