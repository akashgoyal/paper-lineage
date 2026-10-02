// Start paper-intake for a paper: npm run start -- paper-2301-12597
import {refDataset} from '@sanity/workflow-engine'
import {engineWith, PROJECT_ID} from './runtime.ts'

const paperId = process.argv[2]?.replace(/^drafts\./, '')
if (!paperId) throw new Error('Usage: npm run start -- <paper id>')
const result = await engineWith().startInstance({
  definition: 'paper-intake',
  initialFields: [{type: 'subject', name: 'subject', value: refDataset({projectId: PROJECT_ID, dataset: 'production', documentId: paperId, type: 'paper'})}],
})
console.log(JSON.stringify(result, null, 2))
