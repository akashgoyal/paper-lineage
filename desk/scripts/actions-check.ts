// Exercises the Desk's write paths with the same App SDK action creators, against a throwaway
// document in the non-public `workflows` dataset. Run: npx sanity exec scripts/actions-check.ts --with-user-token
import {applyDocumentActions, createDocument, createDocumentHandle, createSanityInstance, deleteDocument, editDocument, publishDocument} from '@sanity/sdk'
import {getCliClient} from 'sanity/cli'

const cli = getCliClient({apiVersion: '2025-02-19', projectId: 'jd22zcim', dataset: 'workflows'}).withConfig({dataset: 'workflows', useCdn: false, perspective: 'raw'})
const instance = createSanityInstance({projectId: 'jd22zcim', dataset: 'workflows', auth: {token: cli.config().token}})
const handle = createDocumentHandle({documentId: `desk-check-${Date.now()}`, documentType: 'influence', projectId: 'jd22zcim', dataset: 'workflows'})
const read = () => cli.fetch(`{"pub": *[_id == $id][0]{relation, provenance}, "draft": *[_id == "drafts." + $id][0].relation}`, {id: handle.documentId})
const step = async (label: string, actions: Parameters<typeof applyDocumentActions>[1]['actions']) => {
  const res = await applyDocumentActions(instance, {actions, ...handle})
  await res.submitted()
  console.log(label, JSON.stringify(await read()))
}

try {
  await step('seed     ', [createDocument(handle), editDocument(handle, {set: {provenance: {reviewDecision: 'proposed', suggestedRelation: 'extends'}}}), publishDocument(handle)])
  await step('relabel  ', [editDocument(handle, {set: {relation: 'combines'}})])
  await step('accept   ', [editDocument(handle, {set: {relation: 'combines', 'provenance.reviewDecision': 'accepted', 'provenance.reviewedBy': 'check', 'provenance.reviewedAt': new Date().toISOString()}}), publishDocument(handle)])
  await step('undo     ', [editDocument(handle, [{set: {'provenance.reviewDecision': 'proposed'}}, {unset: ['provenance.reviewedBy', 'provenance.reviewedAt', 'relation']}]), publishDocument(handle)])
} finally {
  await step('cleanup  ', [deleteDocument(handle)])
  instance.dispose()
}
