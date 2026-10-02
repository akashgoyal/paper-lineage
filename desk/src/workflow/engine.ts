import {useClient} from '@sanity/sdk-react'
import {refDataset, type GdrUri} from '@sanity/workflow-engine'
import {useWorkflowEngine} from '@sanity/workflow-sdk'
import {useCallback} from 'react'
import {DATASET, PROJECT_ID} from '../lib/model'

// Mirrors workflows/sanity.workflow.ts: instances in `workflows`, papers (subjects) in `production`.
export const WORKFLOW_RESOURCE = {type: 'dataset', id: `${PROJECT_ID}.workflows`} as const
export const TAG = 'prod'

export const paperGdr = (paperId: string): GdrUri => `dataset:${PROJECT_ID}:${DATASET}:${paperId.replace(/^drafts\./, '')}`
export const paperIdFromGdr = (gdr?: string) => gdr?.split(':').at(-1) ?? ''

/** The App SDK-side engine for paper-intake, able to reach papers in production. */
export function usePaperIntakeEngine() {
  const content = useClient({apiVersion: '2025-02-19'})
  const resourceClients = useCallback(
    (gdr: {scheme: string; projectId?: string; dataset?: string}) =>
      gdr.scheme === 'dataset' && gdr.projectId === PROJECT_ID && gdr.dataset === DATASET ? content : undefined,
    [content],
  )
  return useWorkflowEngine({workflowResource: WORKFLOW_RESOURCE, tag: TAG, resourceClients})
}

export const subjectField = (paperId: string) => ({
  type: 'subject' as const,
  name: 'subject',
  value: refDataset({projectId: PROJECT_ID, dataset: DATASET, documentId: paperId.replace(/^drafts\./, ''), type: 'paper'}),
})
