import Link from 'next/link'
import {RELATION_COLOR} from '@/lib/format'
import type {LinkFields, PaperCard} from '@/lib/sanity/types'

type Row = LinkFields & {paper: PaperCard}

// Paper "Neighbourhood" (DESIGN_SPEC §6.4): ≤ 8 strongest ancestors fanning into the focus paper.
// Server-rendered SVG + links; the full interactive graph lives in the Explorer.
export function MiniGraph({focus, rows}: {focus: PaperCard; rows: Row[]}) {
  const shown = rows.slice(0, 8)
  const W = 364
  const rowH = 30
  const H = Math.max(120, shown.length * rowH + 20)
  const fx = W - 74
  const fy = H / 2
  return (
    <div className="relative" style={{height: H}}>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} className="absolute inset-0" aria-hidden>
        {shown.map((row, i) => {
          const y = 18 + i * rowH
          const verified = row.decision === 'accepted' && row.relation
          return (
            <path
              key={row._id}
              d={`M 106 ${y} C 190 ${y}, ${fx - 70} ${fy}, ${fx} ${fy}`}
              fill="none"
              stroke={verified ? RELATION_COLOR[row.relation!] : 'var(--unreviewed)'}
              strokeWidth={verified ? 2 : 1.25}
              strokeDasharray={verified ? undefined : '2 4'}
              strokeLinecap="round"
            />
          )
        })}
      </svg>
      {shown.map((row, i) => (
        <Link
          key={row._id}
          href={`/paper/${row.paper.slug}`}
          className="absolute flex h-6 w-24 items-center justify-center truncate rounded-md border border-line-strong bg-surface px-1 text-xs font-semibold text-ink no-underline"
          style={{left: 10, top: 18 + i * rowH - 12}}
          title={`${row.paper.shortName} (${row.paper.publishedAt.slice(0, 4)})`}
        >
          {row.paper.shortName}
        </Link>
      ))}
      <span
        className="absolute flex h-8 w-[70px] items-center justify-center truncate rounded-md bg-ink px-1 text-xs font-semibold text-white"
        style={{left: fx, top: fy - 16}}
      >
        {focus.shortName}
      </span>
    </div>
  )
}
