// POST /api/ask/undo {draftId}: the "Undo" on "Storyline draft sent to curators" (decision D4).
// Deletes only an AI-made storyline DRAFT created in the last 10 minutes; never published content.
import {z} from 'zod'
import {writeClient} from '@/lib/sanity/client'

export const runtime = 'nodejs'

const Body = z.object({draftId: z.string().regex(/^drafts\.storyline-[0-9a-f-]{36}$/)})

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ok: false}, {status: 400})
  const writer = writeClient()
  if (!writer) return Response.json({ok: false}, {status: 503})
  const doc = await writer.fetch<{origin?: string; _createdAt: string} | null>(`*[_id == $id][0]{origin, _createdAt}`, {id: parsed.data.draftId})
  if (!doc || doc.origin !== 'ai' || Date.now() - new Date(doc._createdAt).getTime() > 10 * 60_000) {
    return Response.json({ok: false}, {status: 409})
  }
  await writer.delete(parsed.data.draftId)
  return Response.json({ok: true})
}
