import {Fragment, type ReactNode} from 'react'

/** **bold** spans → <strong>; everything else stays text (no HTML is ever interpreted). */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
  )
}

/** The small markdown subset the Ask prompt allows: paragraphs, "- " bullets and **bold**. */
export function Prose({text}: {text: string}) {
  const blocks: {kind: 'p' | 'ul'; lines: string[]}[] = []
  for (const line of text.split('\n')) {
    const item = line.match(/^\s*[-*]\s+(.*)$/)?.[1]
    const last = blocks.at(-1)
    if (!line.trim()) blocks.push({kind: 'p', lines: []})
    else if (item !== undefined && last?.kind === 'ul') last.lines.push(item)
    else if (item !== undefined) blocks.push({kind: 'ul', lines: [item]})
    else if (last?.kind === 'p' && last.lines.length) last.lines.push(line)
    else blocks.push({kind: 'p', lines: [line]})
  }
  return (
    <>
      {blocks
        .filter((b) => b.lines.length)
        .map((b, i) =>
          b.kind === 'ul' ? (
            <ul key={i} className="m-0 flex list-disc flex-col gap-1 pl-5">
              {b.lines.map((l, j) => (
                <li key={j}>{inline(l)}</li>
              ))}
            </ul>
          ) : (
            <p key={i} className="m-0">
              {inline(b.lines.join(' '))}
            </p>
          ),
        )}
    </>
  )
}
