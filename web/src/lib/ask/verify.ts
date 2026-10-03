// Pure verification rules for Ask's display tools (unit-tested in verify.test.ts).

export const normalize = (s: string) =>
  s
    .normalize('NFKC')
    .replace(/\*\*|__|`/g, '') // Knowledge Base entries are markdown; a quote drops the emphasis marks
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐-―−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

/** A quote may only be shown if it appears verbatim (modulo whitespace, quotes and dashes) in its source. */
export function isVerbatim(quote: string, source: string): boolean {
  const q = normalize(quote).replace(/^["']|["']$/g, '').replace(/^\.\.\.|\.\.\.$|^…|…$/g, '').trim()
  return q.length >= 12 && normalize(source).includes(q)
}

/** Papers in a chain must be listed oldest → newest. */
export function inDateOrder(dates: string[]): boolean {
  return dates.every((d, i) => i === 0 || dates[i - 1] <= d)
}
