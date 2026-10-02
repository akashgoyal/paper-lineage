import 'server-only'
import {createClient} from '@sanity/client'
import {apiVersion, projectId, sanityFetch} from './client'

export const INTAKE_STAGES = [
  {name: 'fetching', title: 'Fetching'},
  {name: 'checks', title: 'Checks'},
  {name: 'curation', title: 'Curation'},
  {name: 'publishing', title: 'Publishing'},
  {name: 'published', title: 'Published'},
] as const

export type IntakeCard = {id: string; stage: string; paper: {shortName: string; slug?: string} | null; decision?: string; updatedAt: string}

// Instance ids (`prod.wf-instance.*`) sit on a private id path, so even in the public `workflows` dataset
// they need a token. Only a safe summary leaves the server: stage, paper, decision.
const INSTANCES = `*[_type == "sanity.workflow.instance" && tag == "prod" && definition == "paper-intake" && !defined(abortedAt)]
  | order(_updatedAt desc)[0...20]{
    "id": _id, "stage": currentStage, "updatedAt": _updatedAt,
    "subject": fields[name == "subject"][0].value.id,
    "decision": fields[name == "decision"][0].value
  }`

/** Live-ish intake board: refreshed every minute (workflow writes don't reach the production Live API). */
export async function intakeBoard(): Promise<IntakeCard[] | null> {
  const token = process.env.SANITY_READ_TOKEN ?? process.env.SANITY_WRITE_TOKEN
  if (!token) return null
  try {
    const wf = createClient({projectId, dataset: 'workflows', apiVersion, token, useCdn: false, perspective: 'raw'})
    const rows = await wf.fetch<{id: string; stage: string; updatedAt: string; subject?: string; decision?: string}[]>(INSTANCES, {}, {next: {revalidate: 60}})
    const ids = rows.map((r) => r.subject?.split(':').at(-1)).filter(Boolean) as string[]
    const papers = await sanityFetch<{_id: string; shortName: string; slug?: string}[]>(`*[_id in $ids]{_id, shortName, "slug": slug.current}`, {ids})
    const byId = new Map(papers.map((p) => [p._id, p]))
    return rows.map((r) => ({id: r.id, stage: r.stage, decision: r.decision, updatedAt: r.updatedAt, paper: byId.get(r.subject?.split(':').at(-1) ?? '') ?? null}))
  } catch {
    return null
  }
}
