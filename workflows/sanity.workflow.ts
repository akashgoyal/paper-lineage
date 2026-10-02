import type {WorkflowDeploymentInput} from '@sanity/workflow-engine'
import {defineWorkflowConfig} from '@sanity/workflow-engine/define'
import {paperIntake} from './src/paper-intake.ts'

// Instances live in the public `workflows` dataset (so /pipeline can read them); papers live in `production`.
export const production = {
  expectedMinReaderModel: 10,
  name: 'production',
  tag: 'prod',
  workflowResource: {type: 'dataset', id: 'jd22zcim.workflows'},
  resourceAliases: [{name: 'content', resource: {type: 'dataset', id: 'jd22zcim.production'}}],
  definitions: [paperIntake],
} satisfies WorkflowDeploymentInput

export default defineWorkflowConfig({deployments: [production]})
