'use client'

import Link from 'next/link'
import {useRouter, useSearchParams} from 'next/navigation'
import {useCallback, useEffect, useRef, useState, useSyncExternalStore} from 'react'
import type {Stats, SiteSettings} from '@/lib/sanity/types'
import {CardSkeleton, CardView, FollowUps, SourcesLine, type OpenItem} from './AnswerCards'
import {conversations as store, type Conversation} from './conversations'
import {OpenedPanel} from './OpenedPanel'
import {applyEvent, parseLines, toHistory, type Turn} from './stream'

const MAX_TURNS = 30
const MAX_CHARS = 500

const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()))

const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 12h14" />
    <path d="M13 6l6 6-6 6" />
  </svg>
)

function Composer(props: {
  big?: boolean
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  onStop?: () => void
  onEditLast?: () => void
  streaming: boolean
  papers: number
  notice?: {tone: 'warning' | 'muted'; text: string}
  disabled?: boolean
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 6 * 26)}px`
  }, [props.value])
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (props.streaming) props.onStop?.()
        else props.onSubmit()
      }}
      className={`flex flex-col gap-2.5 rounded-2xl border border-line-strong bg-surface shadow-[0_6px_24px_rgb(23_25_30/.08)] ${props.big ? 'pb-3 pl-5 pr-4 pt-4' : 'pb-2.5 pl-4 pr-3 pt-3'}`}
    >
      <label htmlFor={props.big ? 'ask-hero' : 'ask-docked'} className="sr-only">
        Ask about papers and ideas
      </label>
      <textarea
        ref={ref}
        id={props.big ? 'ask-hero' : 'ask-docked'}
        rows={props.big ? 2 : 1}
        maxLength={MAX_CHARS}
        value={props.value}
        disabled={props.disabled}
        onChange={(e) => props.onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            if (!props.streaming) props.onSubmit()
          }
          if (e.key === 'ArrowUp' && !props.value) props.onEditLast?.()
        }}
        placeholder={props.big ? 'Where did BLIP-2’s Q-Former come from?' : 'Ask a follow-up…'}
        className={`resize-none border-0 bg-transparent leading-snug text-ink outline-none ${props.big ? 'text-lg' : 'text-base'}`}
      />
      <div className="flex items-center gap-2.5">
        <span className={`text-xs ${props.notice?.tone === 'warning' ? 'rounded bg-warning-bg px-2 py-0.5 text-warning' : 'text-muted'}`}>
          {props.notice?.text ?? `Answers come only from the ${props.papers} papers in this dataset, with quotes. Questions are stored anonymously; don’t include personal details.`}
        </span>
        <span className="flex-1" />
        {props.value.length >= 400 && <span className="tabular font-mono text-xs text-muted">{props.value.length}/{MAX_CHARS}</span>}
        <button
          type="submit"
          aria-label={props.streaming ? 'Stop' : 'Ask'}
          disabled={props.disabled || (!props.streaming && !props.value.trim())}
          className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-ink text-white disabled:opacity-40"
        >
          {props.streaming ? <span aria-hidden className="size-3 rounded-sm bg-white" /> : <SendIcon />}
        </button>
      </div>
    </form>
  )
}

function Answer({turn, onOpen, onAsk, streaming}: {turn: Turn; onOpen: (i: OpenItem) => void; onAsk: (q: string) => void; streaming: boolean}) {
  return (
    <div className="flex flex-col gap-3.5">
      {turn.parts.map((p, i) =>
        p.kind === 'text' ? (
          <div key={i} aria-live={turn.status === 'streaming' ? 'off' : undefined} className="whitespace-pre-wrap font-serif text-[18px] leading-relaxed md:text-[19px]">
            {p.text}
          </div>
        ) : p.card ? (
          <CardView key={p.id} card={p.card} onOpen={onOpen} />
        ) : (
          <CardSkeleton key={p.id} />
        ),
      )}
      {turn.status === 'streaming' && turn.parts.length === 0 && <div className="h-6 w-32 animate-pulse rounded bg-line" aria-label="Thinking" />}
      {turn.outcome === 'partial' && turn.status === 'done' && (
        <p className="m-0 text-[13px] text-ink-2">These links haven’t been reviewed yet, so they show what the papers cite, not how they’re related.</p>
      )}
      {turn.status === 'stopped' && <p className="m-0 text-xs text-muted">Stopped</p>}
      {turn.status === 'error' && turn.error && (
        <p role="alert" className="m-0 text-sm text-danger">
          {turn.error.message}{' '}
          {turn.error.code === 'failed' && (
            <button type="button" onClick={() => onAsk(turn.question)} className="underline">
              Try again
            </button>
          )}
        </p>
      )}
      {turn.sources && turn.status === 'done' && <SourcesLine sources={turn.sources} />}
      {turn.followUps.length > 0 && turn.status !== 'streaming' && <FollowUps items={turn.followUps} onAsk={onAsk} disabled={streaming} />}
      {/* announce once complete, not per token */}
      <span className="sr-only" aria-live="polite">
        {turn.status === 'done' ? `Answer ready. ${turn.parts.filter((p) => p.kind === 'card').length} cards.` : ''}
      </span>
    </div>
  )
}

export function AskApp({settings, stats}: {settings: SiteSettings | null; stats: Stats}) {
  const params = useSearchParams()
  const router = useRouter()
  const conversations = useSyncExternalStore(store.subscribe, store.get, store.server)
  const [current, setCurrent] = useState<Conversation | null>(null)
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [open, setOpen] = useState<OpenItem[]>([])
  const [activeTab, setActiveTab] = useState(0)
  const [blockedUntil, setBlockedUntil] = useState<{until: number; cap: boolean} | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const abort = useRef<AbortController | null>(null)
  const lastQuestion = useRef<HTMLDivElement>(null)
  const startedFromQuery = useRef(false)

  useEffect(() => {
    if (!blockedUntil) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [blockedUntil])

  const persist = useCallback((conv: Conversation) => store.upsert(conv), [])

  const openItem = useCallback((item: OpenItem) => {
    setOpen((items) => {
      const at = items.findIndex((i) => i.kind === item.kind && i.slug === item.slug)
      if (at >= 0) {
        setActiveTab(at)
        return items
      }
      const next = [...items, item].slice(-6)
      setActiveTab(next.length - 1)
      return next
    })
  }, [])

  const ask = useCallback(
    async (text: string) => {
      const question = text.trim().slice(0, MAX_CHARS)
      if (!question || streaming) return
      const base: Conversation = current ?? {id: newId(), title: question.slice(0, 80), turns: [], updatedAt: Date.now()}
      if (base.turns.length >= MAX_TURNS) base.turns = base.turns.slice(-MAX_TURNS + 1)
      let turn: Turn = {id: newId(), question, parts: [], followUps: [], status: 'streaming'}
      let conv = {...base, turns: [...base.turns, turn], updatedAt: Date.now()}
      setCurrent(conv)
      setInput('')
      setStreaming(true)
      requestAnimationFrame(() => lastQuestion.current?.scrollIntoView({behavior: 'smooth', block: 'start'}))

      const update = (t: Turn) => {
        turn = t
        conv = {...conv, turns: [...conv.turns.slice(0, -1), t]}
        setCurrent(conv)
      }
      const controller = new AbortController()
      abort.current = controller
      try {
        const res = await fetch('/api/ask', {
          method: 'POST',
          headers: {'content-type': 'application/json'},
          body: JSON.stringify({messages: [...toHistory(base.turns), {role: 'user', content: question}]}),
          signal: controller.signal,
        })
        const reader = res.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        for (;;) {
          const {value, done} = await reader.read()
          if (done) break
          buffer += decoder.decode(value, {stream: true})
          const {events, rest} = parseLines(buffer)
          buffer = rest
          for (const e of events) {
            update(applyEvent(turn, e))
            if (e.type === 'error' && e.retryAfterSeconds) setBlockedUntil({until: Date.now() + e.retryAfterSeconds * 1000, cap: e.code === 'daily-cap'})
          }
        }
        if (turn.status === 'streaming') update({...turn, status: 'done'})
      } catch (err) {
        if ((err as Error).name === 'AbortError') update({...turn, status: 'stopped'})
        else update(applyEvent(turn, {type: 'error', code: 'failed', message: 'Something went wrong answering that.'}))
      } finally {
        setStreaming(false)
        abort.current = null
        persist(conv)
      }
    },
    [current, streaming, persist],
  )

  // /?q=… (from the ⌘K palette or concept pages) starts a conversation once.
  useEffect(() => {
    const q = params.get('q')
    if (q && !startedFromQuery.current) {
      startedFromQuery.current = true
      router.replace('/', {scroll: false})
      void ask(q)
    }
  }, [params, router, ask])

  const blocked = blockedUntil && blockedUntil.until > now
  const notice = blocked
    ? {tone: 'warning' as const, text: blockedUntil.cap ? 'Ask is resting for today (budget reached). Explore and paper pages still work.' : `You’ve reached the question limit. Try again in ${Math.ceil((blockedUntil.until - now) / 60000)} min.`}
    : undefined
  const composerProps = {
    value: input,
    onChange: setInput,
    onSubmit: () => ask(input),
    onStop: () => abort.current?.abort(),
    onEditLast: () => current?.turns.at(-1) && setInput(current.turns.at(-1)!.question),
    streaming,
    papers: stats.papers,
    notice,
    disabled: !!blocked,
  }

  if (!current) {
    const prompts = settings?.examplePrompts ?? []
    return (
      <main className="mx-auto flex w-full max-w-[820px] flex-col gap-7 px-4 pb-12 pt-14 md:pt-24">
        <div className="flex flex-col gap-3 text-center">
          <h1 className="m-0 font-serif text-[38px] font-medium leading-tight tracking-tight md:text-[54px]">{settings?.heroTitle ?? 'Every idea has ancestors.'}</h1>
          <p className="m-0 text-[17px] leading-normal text-ink-2">{settings?.heroDek}</p>
        </div>
        <Composer big {...composerProps} />
        {prompts.length > 0 && (
          <section aria-labelledby="try" className="flex flex-col gap-2.5">
            <h2 id="try" className="overline m-0">
              Try asking
            </h2>
            <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible">
              {prompts.map((p) => (
                <button key={p} type="button" onClick={() => ask(p)} className="shrink-0 rounded-full border border-line-strong bg-surface px-3.5 py-2 text-left text-sm">
                  {p}
                </button>
              ))}
            </div>
          </section>
        )}
        {settings?.startPapers && (
          <section aria-labelledby="start" className="flex flex-col gap-2.5">
            <h2 id="start" className="overline m-0">
              Or start from a paper
            </h2>
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
              {settings.startPapers.map((p) => (
                <Link key={p._id} href={`/explore?focus=${p.slug}`} className="flex flex-col gap-0.5 rounded-xl border border-line bg-surface px-3.5 py-3 text-ink no-underline">
                  <span className="text-[15px] font-semibold">
                    {p.shortName} <span className="font-mono text-xs font-normal text-muted">{p.publishedAt.slice(0, 4)}</span>
                  </span>
                  <span className="text-[12.5px] text-ink-2">{p.descendants ? `${p.descendants} later papers built on it` : 'Starting point of this dataset'}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
        {conversations.length > 0 && (
          <section aria-labelledby="recent" className="flex flex-col gap-1.5">
            <h2 id="recent" className="overline m-0">
              Your recent questions
            </h2>
            {conversations.slice(0, 5).map((c) => (
              <button key={c.id} type="button" onClick={() => setCurrent(c)} className="truncate text-left text-sm text-[var(--rel-extends)] underline">
                {c.title}
              </button>
            ))}
          </section>
        )}
        <p className="tabular m-0 mt-3 text-center text-[12.5px] text-muted">
          {stats.papers} papers · {stats.links.toLocaleString('en-US')} links · {stats.concepts} concepts · traced back from BLIP-2 through its references
        </p>
      </main>
    )
  }

  return (
    <main className={`mx-auto grid max-w-[1440px] items-start gap-7 px-4 pb-8 pt-6 md:px-8 ${open.length ? 'lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_440px]' : ''}`}>
      <section aria-label="Conversation" className="mx-auto flex w-full max-w-[860px] flex-col gap-6">
        <div className="flex gap-3 text-[13px]">
          <button type="button" disabled={streaming} onClick={() => (setCurrent(null), setOpen([]))} className="rounded-lg border border-line-strong bg-surface px-3 py-1.5 disabled:opacity-50">
            New conversation
          </button>
        </div>
        {current.turns.map((turn, i) => (
          <div key={turn.id} className="flex flex-col gap-4">
            <div ref={i === current.turns.length - 1 ? lastQuestion : undefined} className="max-w-[85%] scroll-mt-24 self-end rounded-[16px_16px_4px_16px] bg-ink px-4 py-3 text-[15.5px] leading-snug text-white md:max-w-[70%]">
              {turn.question}
            </div>
            <Answer turn={turn} onOpen={openItem} onAsk={ask} streaming={streaming} />
          </div>
        ))}
        <div className="sticky bottom-20 mt-2 md:bottom-4">
          <Composer {...composerProps} />
        </div>
      </section>
      <OpenedPanel items={open} active={activeTab} onSelect={setActiveTab} onClose={() => setOpen([])} onAsk={ask} />
    </main>
  )
}
