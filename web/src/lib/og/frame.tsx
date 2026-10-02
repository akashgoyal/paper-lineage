import type {ReactNode} from 'react'

export const OG_SIZE = {width: 1200, height: 630}

/** Shared frame for social cards: paper-coloured ground, wordmark, and a footer line. */
export function OgFrame({eyebrow, title, footer, children}: {eyebrow: string; title: string; footer: string; children?: ReactNode}) {
  return (
    <div style={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#FAF8F4', color: '#16181D', padding: 72, fontFamily: 'serif'}}>
      <div style={{display: 'flex', fontSize: 26, color: '#5A606B', letterSpacing: 1}}>PAPER LINEAGE · {eyebrow}</div>
      <div style={{display: 'flex', marginTop: 36, fontSize: title.length > 40 ? 64 : 84, lineHeight: 1.05}}>{title}</div>
      {children}
      <div style={{display: 'flex', marginTop: 'auto', fontSize: 26, color: '#5A606B', fontFamily: 'monospace'}}>{footer}</div>
    </div>
  )
}
