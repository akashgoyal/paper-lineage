import Link from 'next/link'

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line pb-20 md:pb-8">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-6 gap-y-2 px-4 pt-6 text-[13px] text-ink-2 md:px-8">
        <Link href="/about">About</Link>
        <Link href="/suggest">Suggest a paper</Link>
        <Link href="/about#privacy">Privacy</Link>
        <span className="text-muted">Questions you ask are stored anonymously to improve the dataset.</span>
        <span className="flex-1" />
        <span className="text-muted">Built on Sanity · data from arXiv</span>
      </div>
    </footer>
  )
}
