'use client'

import Link from 'next/link'
import {useActionState} from 'react'
import {lookupPaper, submitSuggestion, type SuggestState} from './actions'

const field = 'h-11 w-full rounded-lg border border-line-strong bg-surface px-3 text-base'

export function SuggestForm() {
  const [lookup, lookupAction, looking] = useActionState<SuggestState, FormData>(lookupPaper, {step: 'idle'})
  const [result, submitAction, submitting] = useActionState<SuggestState, FormData>(submitSuggestion, {step: 'idle'})

  if (result.step === 'done') {
    return (
      <div role="status" className="rounded-xl border border-line bg-surface p-5">
        <p className="m-0 font-serif text-xl">Thanks. Curators will review “{result.meta.title}”.</p>
        <p className="mb-0 mt-2 text-sm text-ink-2">
          Track progress on the <Link href="/pipeline">Pipeline</Link> page.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <form action={lookupAction} className="flex flex-col gap-2">
        <label htmlFor="arxiv" className="text-sm font-medium">
          arXiv link or ID
        </label>
        <div className="flex gap-2">
          <input id="arxiv" name="arxiv" required defaultValue={lookup.step === 'error' ? lookup.input : ''} placeholder="https://arxiv.org/abs/2301.12597" className={field} />
          <button type="submit" disabled={looking} className="h-11 shrink-0 rounded-lg bg-ink px-4 text-sm font-medium text-white disabled:opacity-60">
            {looking ? 'Looking up…' : 'Look up'}
          </button>
        </div>
      </form>

      {lookup.step === 'error' && (
        <p role="alert" className="m-0 text-sm text-danger">
          {lookup.message}
        </p>
      )}
      {result.step === 'error' && (
        <p role="alert" className="m-0 text-sm text-danger">
          {result.message}
        </p>
      )}
      {lookup.step === 'exists' && (
        <p className="m-0 text-sm text-ink-2">
          Already here → <Link href={`/paper/${lookup.slug}`}>Open {lookup.shortName}</Link>
        </p>
      )}

      {lookup.step === 'preview' && (
        <form action={submitAction} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
          <input type="hidden" name="arxiv" value={lookup.meta.id} />
          <div className="overline">Is this the paper?</div>
          <p className="m-0 font-serif text-xl">
            {lookup.meta.title} <span className="text-muted">({lookup.meta.year})</span>
          </p>
          <p className="m-0 text-sm text-ink-2">
            {lookup.meta.authors.slice(0, 4).join(', ')}
            {lookup.meta.authors.length > 4 ? ' et al.' : ''} · {lookup.meta.primaryCategory}
          </p>
          {lookup.outOfScope && <p className="m-0 rounded-lg bg-warning-bg px-3 py-2 text-sm text-warning">This looks outside the dataset’s scope (AI papers), but you can still suggest it.</p>}
          <label htmlFor="why" className="text-sm font-medium">
            Why it belongs <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea id="why" name="why" maxLength={280} rows={3} className="w-full rounded-lg border border-line-strong p-3 text-base" />
          <button type="submit" disabled={submitting} className="self-start rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">
            {submitting ? 'Sending…' : 'Suggest this paper'}
          </button>
        </form>
      )}
    </div>
  )
}
