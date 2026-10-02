import type {Metadata} from 'next'
import {SuggestForm} from './SuggestForm'

export const metadata: Metadata = {title: 'Suggest a paper', description: 'Ask the curators to add a paper to the lineage dataset.'}

export default function SuggestPage() {
  return (
    <main className="mx-auto max-w-[640px] px-4 pb-14 pt-10">
      <h1 className="m-0 font-serif text-4xl font-medium">Suggest a paper</h1>
      <p className="mt-2 text-ink-2">
        AI papers, preferably vision-language models and their ancestors. Curators review every suggestion; nothing is added automatically.
      </p>
      <div className="mt-6">
        <SuggestForm />
      </div>
    </main>
  )
}
