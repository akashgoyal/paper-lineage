import {
  editDocument,
  publishDocument,
  useApplyDocumentActions,
  useCurrentUser,
  type DocumentHandle,
} from '@sanity/sdk-react'
import type {Decision} from '../lib/model'

export type ReviewTarget = {handle: DocumentHandle; decision: Decision; relation?: string | null}

/**
 * Accept / reject in one transaction: write the decision and publish it, like the Studio action.
 * Returns an undo that restores the previous decision (and relation) and publishes again.
 */
export function useReview() {
  const apply = useApplyDocumentActions()
  const user = useCurrentUser()
  const reviewer = user?.name ?? user?.email ?? 'curator'

  const decide = async (targets: ReviewTarget[], decision: Exclude<Decision, 'proposed'>, relationFor?: (t: ReviewTarget) => string | null | undefined) => {
    const at = new Date().toISOString()
    await apply(
      targets.flatMap((t) => {
        const relation = relationFor?.(t)
        return [
          editDocument(t.handle, {
            set: {
              ...(relation ? {relation} : {}),
              'provenance.reviewDecision': decision,
              'provenance.reviewedBy': reviewer,
              'provenance.reviewedAt': at,
            },
          }),
          publishDocument(t.handle),
        ]
      }),
    )
    return () =>
      apply(
        targets.flatMap((t) => [
          editDocument(t.handle, [
            {set: {'provenance.reviewDecision': t.decision, ...(t.relation ? {relation: t.relation} : {})}},
            {unset: ['provenance.reviewedBy', 'provenance.reviewedAt', ...(t.relation ? [] : ['relation'])]},
          ]),
          publishDocument(t.handle),
        ]),
      )
  }
  return decide
}
