'use client'

import {useRouter} from 'next/navigation'
import {useCallback, useEffect, useRef, useState} from 'react'
import {client} from '@/lib/sanity/client'
import {SEARCH_QUERY} from '@/lib/sanity/queries'

type Results = {
  papers: {shortName: string; slug: string; publishedAt: string}[]
  concepts: {name: string; slug: string; theme?: string}[]
  themes: {name: string; slug: string}[]
}
type Row = {label: string; meta?: string; href: string}

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

// ⌘K palette (DESIGN_SPEC §5.1): papers, concepts, themes, and "Ask: …" as the last row.
export function CommandPalette() {
  const router = useRouter()
  const dialog = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Results | null>(null)
  const [active, setActive] = useState(0)

  const open = useCallback(() => {
    dialog.current?.showModal()
    setTimeout(() => input.current?.focus(), 0)
  }, [])
  const close = useCallback(() => {
    dialog.current?.close()
    setQ('')
    setResults(null)
    trigger.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        open()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) {
      setResults(null)
      return
    }
    const id = setTimeout(() => {
      const words = term.split(/\s+/).map((w) => `${w}*`)
      client.fetch<Results>(SEARCH_QUERY, {q: words}).then(setResults).catch(() => setResults(null))
    }, 150)
    return () => clearTimeout(id)
  }, [q])

  const groups: {title: string; rows: Row[]}[] = results
    ? [
        {title: 'Papers', rows: results.papers.map((p) => ({label: p.shortName, meta: p.publishedAt?.slice(0, 4), href: `/paper/${p.slug}`}))},
        {title: 'Concepts', rows: results.concepts.map((c) => ({label: c.name, meta: c.theme, href: `/concept/${c.slug}`}))},
        {title: 'Themes', rows: results.themes.map((t) => ({label: t.name, href: `/theme/${t.slug}`}))},
      ].filter((g) => g.rows.length)
    : []
  if (q.trim()) groups.push({title: 'Ask', rows: [{label: `Ask: ${q.trim()}`, href: `/?q=${encodeURIComponent(q.trim())}`}]})
  const flat = groups.flatMap((g) => g.rows)

  const go = (row?: Row) => {
    if (!row) return
    close()
    router.push(row.href)
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={open}
        aria-label="Search papers, concepts, authors"
        className="flex h-[38px] items-center gap-2.5 rounded-lg border border-line-strong bg-ground px-3 text-sm text-muted md:min-w-[280px]"
      >
        <SearchIcon />
        <span className="hidden flex-1 text-left md:inline">Search papers and concepts</span>
        <kbd className="hidden rounded border border-line-strong px-1.5 font-mono text-xs md:inline">⌘K</kbd>
      </button>
      <dialog
        ref={dialog}
        aria-label="Search"
        onClose={() => setQ('')}
        onClick={(e) => e.target === dialog.current && close()}
        className="mx-auto mt-24 w-[min(640px,calc(100%-32px))] rounded-2xl border border-line bg-surface p-0 shadow-[0_6px_24px_rgb(23_25_30/.12)] backdrop:bg-black/20"
      >
        <div className="flex items-center gap-2 border-b border-line px-4">
          <SearchIcon />
          <input
            ref={input}
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setActive(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') (e.preventDefault(), setActive((a) => Math.min(a + 1, flat.length - 1)))
              if (e.key === 'ArrowUp') (e.preventDefault(), setActive((a) => Math.max(a - 1, 0)))
              if (e.key === 'Enter') go(flat[active])
            }}
            placeholder="Search papers, concepts, themes…"
            aria-label="Search"
            className="h-12 flex-1 bg-transparent text-base outline-none"
          />
          <kbd className="rounded border border-line-strong px-1.5 font-mono text-xs text-muted">Esc</kbd>
        </div>
        <div className="max-h-[60vh] overflow-auto p-2" role="listbox" aria-label="Results">
          {q.trim().length >= 2 && results && flat.length === 1 && (
            <p className="px-3 py-2 text-sm text-ink-2">No paper or concept named “{q.trim()}”. Ask about it instead:</p>
          )}
          {groups.map((group) => (
            <div key={group.title} className="mb-1">
              <div className="overline px-3 pb-1 pt-2">{group.title}</div>
              {group.rows.map((row) => {
                const index = flat.indexOf(row)
                return (
                  <button
                    key={row.href}
                    type="button"
                    role="option"
                    aria-selected={index === active}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => go(row)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${index === active ? 'bg-ground' : ''}`}
                  >
                    <span className="text-ink">{row.label}</span>
                    {row.meta && <span className="font-mono text-xs text-muted">{row.meta}</span>}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </dialog>
    </>
  )
}
