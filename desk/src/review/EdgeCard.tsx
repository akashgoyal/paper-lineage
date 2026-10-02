import {
  editDocument,
  useAgentGenerate,
  useApplyDocumentActions,
  useDocumentProjection,
  useNavigateToStudioDocument,
  type DocumentHandle,
} from '@sanity/sdk-react'
import {Badge, Box, Button, Card, Flex, Grid, Radio, Stack, Text, TextArea, Tooltip} from '@sanity/ui'
import {useEffect, useRef, useState} from 'react'
import {HIGH_CONFIDENCE, RELATIONS, SCHEMA_ID, year, type Decision} from '../lib/model'
import {DecisionBadge, useErrorToast, useUndoToast} from '../lib/ui'
import {useKeys} from '../lib/keys'
import {useReview} from './actions'
import {EDGE_PROJECTION} from '../lib/queries'

export type Edge = {
  _id: string
  from: {shortName: string; publishedAt: string; authors?: string[]} | null
  to: {shortName: string} | null
  relation: string | null
  explanation: string | null
  evidenceKey: string | null
  decision: Decision
  suggested: string | null
  origin: string | null
  confidence: number | null
  mentions: number | null
  methodMentions: number | null
  contexts: {_key: string; section?: string; text?: string}[] | null
}

/** Highlight the cited author's surname inside the citation sentence. */
function Highlighted({text, surname}: {text: string; surname?: string}) {
  if (!surname) return <>{text}</>
  // Split keeps the matches at odd positions; character offsets make stable keys.
  let at = 0
  const pattern = new RegExp(`(${surname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'i')
  const parts = text.split(pattern).map((p, i) => {
    const part = {text: p, match: i % 2 === 1, at}
    at += p.length
    return part
  })
  return (
    <>
      {parts.map(({text: p, match, at: offset}) =>
        match ? (
          <mark key={offset} style={{background: 'rgba(52,70,196,0.14)', color: 'inherit', borderRadius: 2, padding: '0 2px'}}>
            {p}
          </mark>
        ) : (
          <span key={offset}>{p}</span>
        ),
      )}
    </>
  )
}

export function EdgeCard({handle, focused, onFocus}: {handle: DocumentHandle; focused: boolean; onFocus: () => void}) {
  const {data: e} = useDocumentProjection<Edge>({...handle, projection: EDGE_PROJECTION})
  const apply = useApplyDocumentActions()
  const decide = useReview()
  const undoToast = useUndoToast()
  const errorToast = useErrorToast()
  const generate = useAgentGenerate()
  const {navigateToStudioDocument} = useNavigateToStudioDocument(handle)
  const [busy, setBusy] = useState<'accept' | 'reject' | 'explain' | null>(null)
  const [showAll, setShowAll] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (focused) ref.current?.scrollIntoView({block: 'nearest', behavior: 'smooth'})
  }, [focused])

  const relation = e?.relation ?? e?.suggested ?? null
  const setRelation = (value: string) => apply(editDocument(handle, {set: {relation: value}})).catch((err) => errorToast('Could not change the relation', err))
  const setEvidence = (key: string) => apply(editDocument(handle, {set: {evidenceKey: key}})).catch((err) => errorToast('Could not change the evidence', err))
  const setExplanation = (value: string) => apply(editDocument(handle, value ? {set: {explanation: value}} : {unset: ['explanation']}))

  const run = async (decision: 'accepted' | 'rejected') => {
    if (!e || busy) return
    if (decision === 'accepted' && !relation) return errorToast('Choose a relation first', 'An accepted link needs a relation.')
    setBusy(decision === 'accepted' ? 'accept' : 'reject')
    try {
      const undo = await decide([{handle, decision: e.decision, relation: e.relation}], decision, () => (decision === 'accepted' ? relation : undefined))
      undoToast(`${e.from?.shortName} → ${e.to?.shortName} ${decision}`, undo)
    } catch (err) {
      errorToast('Review failed', err)
    } finally {
      setBusy(null)
    }
  }

  // Agent Action: write a one-sentence explanation into the draft, grounded in the chosen citation sentence.
  const explain = () => {
    if (!e || busy) return
    const sentence = e.contexts?.find((c) => c._key === e.evidenceKey)?.text ?? e.contexts?.[0]?.text
    if (!sentence) return errorToast('No citation sentence', 'There is nothing to ground an explanation in.')
    setBusy('explain')
    generate({
      schemaId: SCHEMA_ID,
      documentId: handle.documentId,
      instruction: `In one plain sentence (max 200 characters), explain how $to builds on $from, using only this citation sentence from $to: "$sentence". Relation: $relation. No hype, no claims beyond the sentence.`,
      instructionParams: {from: e.from?.shortName ?? '', to: e.to?.shortName ?? '', sentence, relation: relation ?? 'unknown'},
      target: {path: 'explanation'},
    }).subscribe({
      complete: () => setBusy(null),
      error: (err: unknown) => {
        setBusy(null)
        errorToast('Agent Action failed', err)
      },
    })
  }

  useKeys(
    {
      a: () => run('accepted'),
      r: () => run('rejected'),
      e: () => ref.current?.querySelector<HTMLInputElement>('input[type=radio]:checked, input[type=radio]')?.focus(),
      w: explain,
      o: navigateToStudioDocument,
      ...Object.fromEntries(RELATIONS.map((r, i) => [String(i + 1), () => setRelation(r.value)])),
    },
    focused,
  )

  if (!e) return null
  const surname = e.from?.authors?.[0]?.split(' ').at(-1)
  const high = (e.confidence ?? 0) >= HIGH_CONFIDENCE && (e.methodMentions ?? 0) > 0
  const contexts = e.contexts ?? []
  const visible = showAll ? contexts : contexts.filter((c) => c._key === (e.evidenceKey ?? contexts[0]?._key))

  return (
    <Card
      ref={ref}
      padding={4}
      radius={3}
      border
      onClick={onFocus}
      style={{outline: focused ? '2px solid #3446C4' : 'none', outlineOffset: 1, cursor: focused ? 'default' : 'pointer'}}
      tone={e.decision === 'rejected' ? 'critical' : e.decision === 'accepted' ? 'positive' : 'default'}
    >
      <Stack space={4}>
        <Flex align="center" gap={3} wrap="wrap">
          <Text size={2} weight="semibold">
            {e.from?.shortName} <span style={{opacity: 0.5}}>({year(e.from?.publishedAt)})</span> → {e.to?.shortName}
          </Text>
          <DecisionBadge decision={e.decision} />
          {high && <Badge tone="primary">High confidence</Badge>}
          {(e.confidence ?? 1) < 0.5 && <Badge tone="caution">Low confidence</Badge>}
          <Box flex={1} />
          <Text size={1} muted>
            cited {e.mentions ?? 0}× · {e.methodMentions ?? 0} in Method · confidence {e.confidence?.toFixed(2) ?? '–'}
          </Text>
        </Flex>

        <Stack space={2}>
          {visible.length ? (
            visible.map((c) => (
              <Card key={c._key} padding={3} radius={2} tone={c._key === e.evidenceKey ? 'primary' : 'transparent'} border>
                <Flex gap={3} align="flex-start">
                  {showAll && <Radio checked={c._key === e.evidenceKey} onChange={() => setEvidence(c._key)} aria-label="Use as evidence" />}
                  <Stack space={2} flex={1}>
                    <Text size={0} muted weight="semibold" style={{textTransform: 'uppercase'}}>
                      {c.section ?? 'Citation'}
                    </Text>
                    <Text size={1} style={{fontFamily: 'Georgia, serif', lineHeight: 1.5}}>
                      “<Highlighted text={c.text ?? ''} surname={surname} />”
                    </Text>
                  </Stack>
                </Flex>
              </Card>
            ))
          ) : (
            <Text size={1} muted>
              No citation sentences were captured.
            </Text>
          )}
          {contexts.length > 1 && (
            <Button mode="bleed" fontSize={1} padding={2} text={showAll ? 'Hide other sentences' : `Pick evidence (${contexts.length} sentences)`} onClick={() => setShowAll(!showAll)} />
          )}
        </Stack>

        <Grid columns={[1, 2]} gap={2}>
          {RELATIONS.map((r, i) => (
            <Flex as="label" key={r.value} align="center" gap={2} style={{cursor: 'pointer'}}>
              <Radio name={`rel-${e._id}`} checked={relation === r.value} onChange={() => setRelation(r.value)} />
              <span style={{width: 14, height: 3, borderRadius: 2, background: r.color}} />
              <Text size={1}>
                {r.title}
                {e.suggested === r.value && !e.relation && (
                  <span style={{opacity: 0.6}}> · suggested by {e.origin === 'ai' ? 'AI' : 'harvest'}</span>
                )}
                {focused && <span style={{opacity: 0.4}}> {i + 1}</span>}
              </Text>
            </Flex>
          ))}
        </Grid>

        <ExplanationField key={e.explanation ?? ''} value={e.explanation ?? ''} onCommit={setExplanation} />

        <Flex gap={2} wrap="wrap">
          <Button tone="positive" text={busy === 'accept' ? 'Accepting…' : 'Accept'} disabled={!!busy || e.decision === 'accepted'} onClick={() => run('accepted')} />
          <Button tone="critical" mode="ghost" text={busy === 'reject' ? 'Rejecting…' : 'Reject'} disabled={!!busy || e.decision === 'rejected'} onClick={() => run('rejected')} />
          <Tooltip content={<Box padding={2}><Text size={1}>Agent Action · uses AI credits</Text></Box>} portal>
            <Button mode="ghost" text={busy === 'explain' ? 'Writing…' : 'Write explanation'} disabled={!!busy} onClick={explain} />
          </Tooltip>
          <Button mode="bleed" text="Open in Studio" onClick={navigateToStudioDocument} />
        </Flex>
      </Stack>
    </Card>
  )
}

/** Explanation is the one free-text field; it commits on blur (each keystroke would be a transaction). */
function ExplanationField({value, onCommit}: {value: string; onCommit: (v: string) => Promise<unknown>}) {
  const [draft, setDraft] = useState(value)
  return (
    <Stack space={2}>
      <Text size={1} muted>
        Explanation (shown on the site once verified) · {draft.length}/280
      </Text>
      <TextArea
        rows={2}
        value={draft}
        maxLength={280}
        placeholder="One sentence: what did the later paper take from the earlier one?"
        onChange={(ev) => setDraft(ev.currentTarget.value)}
        onBlur={() => draft !== value && void onCommit(draft.trim())}
      />
    </Stack>
  )
}
