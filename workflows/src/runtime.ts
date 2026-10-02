import {readFileSync} from 'node:fs'
import {homedir} from 'node:os'
import {join} from 'node:path'
import {createClient, type SanityClient} from '@sanity/client'
import {createEngine, type EffectHandler} from '@sanity/workflow-engine'

export const PROJECT_ID = 'jd22zcim'
export const TAG = 'prod'
export const WORKFLOW_RESOURCE = {type: 'dataset', id: `${PROJECT_ID}.workflows`} as const

/** SANITY_AUTH_TOKEN for CI / hosted use; locally the `sanity login` session, as the workflow CLI does. */
function token(): string {
  if (process.env.SANITY_AUTH_TOKEN) return process.env.SANITY_AUTH_TOKEN
  try {
    const config = JSON.parse(readFileSync(join(homedir(), '.config', 'sanity', 'config.json'), 'utf8')) as {authToken?: string}
    if (config.authToken) return config.authToken
  } catch {
    /* fall through */
  }
  throw new Error('No token: run `npx sanity login` or set SANITY_AUTH_TOKEN (Editor role on project jd22zcim).')
}

export const workflowsClient = createClient({projectId: PROJECT_ID, dataset: 'workflows', apiVersion: '2025-02-19', token: token(), useCdn: false})
export const content: SanityClient = workflowsClient.withConfig({dataset: 'production', perspective: 'raw'})

export const engineWith = (handlers?: Record<string, EffectHandler>) =>
  createEngine({
    client: workflowsClient,
    tag: TAG,
    workflowResource: WORKFLOW_RESOURCE,
    // Subjects (papers) live in production; declaring it here is what lets runtime refs point there.
    resourceClients: (gdr) => (gdr.scheme === 'dataset' && gdr.projectId === PROJECT_ID && gdr.dataset === 'production' ? workflowsClient.withConfig({dataset: 'production'}) : undefined),
    effects: handlers ? {handlers} : undefined,
  })
