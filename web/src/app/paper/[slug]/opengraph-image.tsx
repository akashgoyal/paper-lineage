import {ImageResponse} from 'next/og'
import {year} from '@/lib/format'
import {OG_SIZE, OgFrame} from '@/lib/og/frame'
import {sanityFetch} from '@/lib/sanity/client'
import {OG_PAPER_QUERY} from '@/lib/sanity/queries'

export const alt = 'Paper lineage card'
export const size = OG_SIZE
export const contentType = 'image/png'
export {generateStaticParams} from './page'

type OgPaper = {shortName: string; title: string; publishedAt: string; authors?: string[]; builtOn: number; ledTo: number; verified: number}

export default async function Image({params}: {params: Promise<{slug: string}>}) {
  const paper = await sanityFetch<OgPaper | null>(OG_PAPER_QUERY, {slug: (await params).slug})
  if (!paper) return new ImageResponse(<OgFrame eyebrow="PAPER" title="Paper not found" footer="" />, size)
  const authors = paper.authors?.length ? `${paper.authors[0]}${paper.authors.length > 1 ? ' et al.' : ''}` : ''
  return new ImageResponse(
    (
      <OgFrame eyebrow={`PAPER · ${year(paper.publishedAt)}`} title={paper.shortName} footer={`built on ${paper.builtOn} · led to ${paper.ledTo} · ${paper.verified} verified`}>
        <div style={{display: 'flex', marginTop: 20, fontSize: 32, color: '#3A3F48', lineHeight: 1.3}}>{paper.title.length > 110 ? `${paper.title.slice(0, 107)}…` : paper.title}</div>
        <div style={{display: 'flex', marginTop: 16, fontSize: 24, color: '#5A606B'}}>{authors}</div>
      </OgFrame>
    ),
    size,
  )
}
