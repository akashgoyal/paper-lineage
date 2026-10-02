// Pure helpers shared by the Studio inputs/views and their tests (no React, no Sanity imports).

const ARXIV_IN_TEXT = /(\d{4}\.\d{4,5})(?:v\d+)?/

/** "https://arxiv.org/pdf/2301.12597v3", "arXiv:2301.12597", "2301.12597v1" → "2301.12597" */
export function normalizeArxivId(raw: string): string {
  const match = raw.trim().match(ARXIV_IN_TEXT)
  return match ? match[1] : raw.trim()
}

export const ARXIV_ID = /^\d{4}\.\d{4,5}$/

export const squash = (s = ''): string => s.replace(/\s+/g, ' ').trim()

/** Split text around every occurrence of `needle`, keeping the matches as their own parts. */
export function splitHighlight(text: string, needle?: string): {text: string; hit: boolean}[] {
  if (!needle) return [{text, hit: false}]
  return text
    .split(new RegExp(`(${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g'))
    .filter((part) => part !== '')
    .map((part) => ({text: part, hit: part === needle}))
}

/** Last word of the first author's name ("Jean-Baptiste Alayrac" → "Alayrac"). */
export const surnameOf = (author?: string | null): string | undefined => author?.trim().split(/\s+/).at(-1)

/** Find the paragraph (of the later paper's full text) that contains a citation sentence. */
export function paragraphFor(
  sentence: string,
  sections: {heading?: string; text?: string}[] = [],
): {heading?: string; paragraph: string} | null {
  const probe = squash(sentence).slice(0, 60)
  if (!probe) return null
  for (const section of sections) {
    for (const paragraph of (section.text ?? '').split('\n\n')) {
      if (squash(paragraph).includes(probe)) return {heading: section.heading, paragraph: squash(paragraph)}
    }
  }
  return null
}
