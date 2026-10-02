import type {Metadata} from 'next'
import {IBM_Plex_Mono, IBM_Plex_Sans, Newsreader} from 'next/font/google'
import {Footer} from '@/components/Footer'
import {TopNav} from '@/components/TopNav'
import {SanityLive} from '@/lib/sanity/live'
import './globals.css'

const newsreader = Newsreader({variable: '--font-newsreader', subsets: ['latin'], weight: 'variable', style: ['normal', 'italic'], display: 'swap'})
const plexSans = IBM_Plex_Sans({variable: '--font-plex-sans', subsets: ['latin'], weight: ['400', '500', '600'], display: 'swap'})
const plexMono = IBM_Plex_Mono({variable: '--font-plex-mono', subsets: ['latin'], weight: ['400', '500'], display: 'swap'})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {default: 'Paper Lineage: every idea has ancestors', template: '%s · Paper Lineage'},
  description:
    'Ask where an AI idea came from, what a paper built on, or how two papers are connected. An evidence-backed family tree of 197 papers traced back from BLIP-2.',
  openGraph: {siteName: 'Paper Lineage', type: 'website'},
}

export default function RootLayout({children}: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${newsreader.variable} ${plexSans.variable} ${plexMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <TopNav />
        <div className="flex-1">{children}</div>
        <Footer />
        <SanityLive />
      </body>
    </html>
  )
}
