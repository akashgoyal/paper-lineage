import {PortableText, type PortableTextComponents} from '@portabletext/react'
import Link from 'next/link'

export type Block = {_type: string; _key: string; [k: string]: unknown}

// Mentions resolve to their own pages, so a story stays linked data rather than prose.
const mention = ({value, children}: {value?: {href?: string; label?: string}; children: React.ReactNode}) =>
  value?.href ? (
    <Link href={value.href} title={value.label} className="text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
      {children}
    </Link>
  ) : (
    <>{children}</>
  )

const components: PortableTextComponents = {
  block: {
    normal: ({children}) => <p className="my-4 font-serif text-[19px] leading-relaxed text-ink">{children}</p>,
    blockquote: ({children}) => <blockquote className="my-4 border-l-2 border-line-strong pl-4 font-serif text-[19px] italic text-ink-2">{children}</blockquote>,
  },
  marks: {paperMention: mention, conceptMention: mention, linkMention: mention},
}

export function RichText({value}: {value: Block[]}) {
  return <PortableText value={value} components={components} />
}
