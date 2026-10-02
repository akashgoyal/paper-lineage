// Small arXiv helpers shared by Suggest-a-paper (and kept pure where possible for tests).

const ARXIV_IN_TEXT = /(\d{4}\.\d{4,5})(?:v\d+)?/
export const ARXIV_ID = /^\d{4}\.\d{4,5}$/

/** "https://arxiv.org/pdf/2301.12597v3", "arXiv:2301.12597", "2301.12597v1" → "2301.12597" (same rule as the Studio input). */
export function normalizeArxivId(raw: string): string {
  const match = raw.trim().match(ARXIV_IN_TEXT)
  return match ? match[1] : raw.trim()
}

export type ArxivMeta = {id: string; title: string; year: string; primaryCategory: string; authors: string[]}

const tag = (xml: string, name: string) => xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))?.[1]?.replace(/\s+/g, ' ').trim() ?? ''

/** Parse one entry of the arXiv Atom API response. Returns null when arXiv reports no such paper. */
export function parseArxivEntry(xml: string, id: string): ArxivMeta | null {
  const entry = xml.match(/<entry>([\s\S]*?)<\/entry>/)?.[1]
  if (!entry) return null
  const title = tag(entry, 'title')
  if (!title || /^Error$/i.test(title)) return null
  return {
    id,
    title,
    year: tag(entry, 'published').slice(0, 4),
    primaryCategory: entry.match(/<arxiv:primary_category[^>]*term="([^"]+)"/)?.[1] ?? '',
    authors: [...entry.matchAll(/<name>([^<]+)<\/name>/g)].map((m) => m[1].trim()),
  }
}

export async function fetchArxiv(id: string): Promise<ArxivMeta | null> {
  const res = await fetch(`https://export.arxiv.org/api/query?id_list=${id}`, {next: {revalidate: 86_400}})
  if (!res.ok) throw new Error(`arXiv responded ${res.status}`)
  return parseArxivEntry(await res.text(), id)
}
