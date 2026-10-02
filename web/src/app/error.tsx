'use client'

import Link from 'next/link'
import {useEffect} from 'react'

export default function ErrorPage({error, reset}: {error: Error & {digest?: string}; reset: () => void}) {
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <main className="mx-auto max-w-[640px] px-4 py-24 text-center">
      <h1 className="font-serif text-4xl font-medium">Something broke on this page.</h1>
      <p className="mt-3 text-ink-2">It’s been logged. You can try again, or go back to asking questions.</p>
      <p className="mt-6 flex justify-center gap-6">
        <button type="button" onClick={reset} className="rounded-lg bg-ink px-4 py-2 text-sm text-white">
          Try again
        </button>
        <Link href="/" className="self-center">
          Back to Ask
        </Link>
      </p>
    </main>
  )
}
