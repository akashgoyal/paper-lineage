// A bibliography can list the same work twice (preprint + proceedings, or two versions), which
// yields two raw edges for one citing→cited pair. Merge them: counts add up, sentences de-duplicate.
export function mergeEdges(edges) {
  const byPair = new Map()
  for (const e of edges) {
    const key = `${e.citing}>${e.cited}`
    const seen = byPair.get(key)
    if (!seen) {
      byPair.set(key, {...e, sections: [...e.sections], contexts: [...(e.contexts ?? [])]})
      continue
    }
    seen.mentions += e.mentions
    seen.methodMentions += e.methodMentions
    seen.relatedMentions += e.relatedMentions
    seen.sections = [...new Set([...seen.sections, ...e.sections])]
    for (const c of e.contexts ?? []) {
      if (!seen.contexts.some((x) => x.text === c.text)) seen.contexts.push(c)
    }
  }
  return [...byPair.values()]
}
