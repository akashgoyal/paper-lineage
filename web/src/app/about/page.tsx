import type {Metadata} from 'next'
import Link from 'next/link'
import {RelationChip} from '@/components/ui'
import {sanityFetch} from '@/lib/sanity/client'
import {STATS_QUERY} from '@/lib/sanity/queries'
import type {Stats} from '@/lib/sanity/types'

export const metadata: Metadata = {title: 'About', description: 'How Paper Lineage is built, how links are verified, where the data comes from, and what is stored.'}

const h2 = 'mb-2 mt-10 font-serif text-2xl font-medium scroll-mt-24'

export default async function AboutPage() {
  const stats = await sanityFetch<Stats>(STATS_QUERY)
  return (
    <main className="mx-auto max-w-[760px] px-4 pb-14 pt-10 text-[16px] leading-relaxed">
      <h1 className="m-0 font-serif text-4xl font-medium">About Paper Lineage</h1>
      <p className="mt-3 font-serif text-xl">
        Every idea has ancestors. Paper Lineage traces {stats.papers} AI papers back from BLIP-2 (2023), through the papers they built on, to
        the ideas those papers introduced.
      </p>
      <p>
        You can ask where an idea came from, what a paper built on, or how two papers are connected. Every answer points to the papers and
        the sentences behind it.
      </p>

      <h2 id="verification" className={h2}>How links are verified</h2>
      <p>Each link between two papers holds two different kinds of claim, and they look different on every page:</p>
      <ul className="flex list-none flex-col gap-3 p-0">
        <li className="rounded-xl border border-line bg-surface p-4">
          <RelationChip relation={null} />
          <p className="m-0 mt-1.5 text-sm">
            <b>A citation fact</b>: “BLIP-2 cites Flamingo 5 times”, with the sentence and section. Mined automatically from the later paper’s
            full text, and always shown.
          </p>
        </li>
        <li className="rounded-xl border border-line bg-surface p-4">
          <RelationChip relation="extends" decision="accepted" />
          <p className="m-0 mt-1.5 text-sm">
            <b>A lineage claim</b>: “BLIP-2 extends BLIP”. A judgement, so it appears only after a human curator has read the evidence and
            accepted it ({stats.accepted.toLocaleString('en-US')} of {stats.links.toLocaleString('en-US')} so far).
          </p>
        </li>
      </ul>
      <p>Summaries and concept tags written by AI are labelled “Drafted by AI · not yet reviewed”.</p>

      <h2 id="data" className={h2}>Where the data comes from</h2>
      <p>
        Starting from BLIP-2, a script read each paper’s full text (arXiv’s HTML renders, or the PDF), parsed its bibliography, and kept
        every in-text citation with its sentence and section. A reference counted as influence when it was cited twice or more, or inside a
        Method-like section. That walk went three generations back: {stats.papers} papers and {stats.links.toLocaleString('en-US')} links.
        {stats.concepts} concepts in {stats.themes} themes were then written from the papers’ abstracts and credited to the paper that
        introduced each one.
      </p>
      <p>
        Limits: only papers on arXiv are included, the dataset is traced backwards from one paper, and citation sentences are parsed
        automatically, so a few may be cut or misplaced.
      </p>

      <h2 id="built" className={h2}>Built with Sanity</h2>
      <p>
        The papers, links and concepts live in Sanity’s Content Lake. Curators work in a customised Sanity Studio and the Lineage Desk (an
        App SDK app). The Ask page uses Sanity Context, with one endpoint over the live dataset and one over a Knowledge Base of the papers’
        full text. Live updates come from Sanity’s Live Content API.
      </p>

      <h2 id="privacy" className={h2}>Privacy</h2>
      <p>
        When you ask a question we store its text, the time, whether it was answered, and which papers were cited, under private IDs that
        public queries can’t read. We don’t store IP addresses (the rate limiter keeps only a salted hash, for at most a day), set no
        cookies, and run no analytics. Your conversations stay in your own browser.
      </p>

      <h2 className={h2}>Credits</h2>
      <p>
        Papers and metadata from <a href="https://arxiv.org">arXiv</a> and <a href="https://ar5iv.labs.arxiv.org">ar5iv</a>; title lookups
        via <a href="https://openalex.org">OpenAlex</a>. <Link href="/suggest">Suggest a paper</Link> that belongs here.
      </p>
    </main>
  )
}
