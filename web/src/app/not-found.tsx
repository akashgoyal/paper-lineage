import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="mx-auto max-w-[640px] px-4 py-24 text-center">
      <h1 className="font-serif text-4xl font-medium">No page here.</h1>
      <p className="mt-3 text-ink-2">
        The paper or concept may not be in this dataset. Press <kbd className="rounded border border-line-strong px-1.5 font-mono text-xs">⌘K</kbd> to
        search, or try one of these:
      </p>
      <p className="mt-6 flex justify-center gap-6">
        <Link href="/">Ask a question</Link>
        <Link href="/explore">Explore the lineage</Link>
        <Link href="/concepts">Browse concepts</Link>
      </p>
    </main>
  )
}
