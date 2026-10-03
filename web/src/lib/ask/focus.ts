// Which paper an Ask answer is about, so Explore can open on it (pure, unit-tested in focus.test.ts).

export type NamedPaper = {slug: string; shortName: string; publishedAt?: string}

const words = (s: string) => ` ${s.toLowerCase().replace(/[’']s\b/g, '').replace(/[^a-z0-9.+-]+/g, ' ').trim()} `

/**
 * The paper the question names, preferring the longest name ("BLIP-2's Q-Former" → BLIP-2, not BLIP).
 * If it names none, the newest paper the answer showed. Null when there is neither.
 */
export function answerSubject(question: string, papers: NamedPaper[], shown: NamedPaper[] = []): NamedPaper | null {
  const q = words(question)
  const named = papers
    .filter((p) => p.shortName.length >= 2 && q.includes(words(p.shortName)))
    .sort((a, b) => b.shortName.length - a.shortName.length)[0]
  if (named) return named
  return [...shown].sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))[0] ?? null
}
