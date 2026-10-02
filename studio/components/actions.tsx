import {CheckmarkIcon} from '@sanity/icons/Checkmark'
import {CloseIcon} from '@sanity/icons/Close'
import {useState} from 'react'
import {useCurrentUser, useDocumentOperation, type DocumentActionComponent, type DocumentActionProps} from 'sanity'

type Influence = {relation?: string; provenance?: {reviewDecision?: string}}

function useReview(props: DocumentActionProps, decision: 'accepted' | 'rejected') {
  const {patch, publish} = useDocumentOperation(props.id, props.type)
  const user = useCurrentUser()
  const [busy, setBusy] = useState(false)
  const run = () => {
    setBusy(true)
    patch.execute([
      {
        set: {
          'provenance.reviewDecision': decision,
          'provenance.reviewedBy': user?.name ?? user?.email ?? 'curator',
          'provenance.reviewedAt': new Date().toISOString(),
        },
      },
    ])
    // Accept / reject is a single step for curators: the decision is published together with the edit.
    publish.execute()
    props.onComplete()
  }
  return {busy, run, publishDisabled: publish.disabled}
}

export const AcceptLinkAction: DocumentActionComponent = (props) => {
  const doc = (props.draft ?? props.published) as Influence | null
  const {busy, run} = useReview(props, 'accepted')
  const alreadyAccepted = !props.draft && doc?.provenance?.reviewDecision === 'accepted'
  return {
    label: busy ? 'Accepting…' : 'Accept link',
    icon: CheckmarkIcon,
    tone: 'positive',
    shortcut: 'mod+shift+a',
    disabled: busy || alreadyAccepted || !doc?.relation,
    title: !doc?.relation ? 'Choose a relation before accepting' : alreadyAccepted ? 'Already accepted' : undefined,
    onHandle: run,
  }
}

export const RejectLinkAction: DocumentActionComponent = (props) => {
  const doc = (props.draft ?? props.published) as Influence | null
  const {busy, run} = useReview(props, 'rejected')
  return {
    label: busy ? 'Rejecting…' : 'Reject link',
    icon: CloseIcon,
    tone: 'critical',
    disabled: busy || (!props.draft && doc?.provenance?.reviewDecision === 'rejected'),
    onHandle: run,
  }
}
