import {createDocumentHandle, useDocuments, useQuery, type DocumentHandle} from '@sanity/sdk-react'
import {Badge, Box, Button, Card, Dialog, Flex, Stack, Switch, Text} from '@sanity/ui'
import {useState} from 'react'
import {DATASET, HIGH_CONFIDENCE, PROJECT_ID, ago, relationTitle, year} from '../lib/model'
import {useKeys} from '../lib/keys'
import {Boundary, Empty, Overline, useErrorToast, useUndoToast} from '../lib/ui'
import {useReview} from './actions'
import {EdgeCard} from './EdgeCard'
import {QUEUE, HEADER, HOOD, ACTIVITY} from '../lib/queries'

type QueueRow = {_id: string; shortName: string; publishedAt: string; left: number; low: number; method: number}

export function ReviewTab() {
  const [paper, setPaper] = useState<string | null>(null)
  return (
    <>
      <Card borderRight overflow="auto" style={{width: 270, flexShrink: 0}}>
        <Boundary label="Loading queue…">
          <Queue selected={paper} onSelect={setPaper} />
        </Boundary>
      </Card>
      <Box flex={1} overflow="auto">
        {paper ? (
          <Boundary key={paper} label="Loading links…">
            <PaperReview paperId={paper} />
          </Boundary>
        ) : (
          <Empty title="Pick a paper from the queue">Its incoming lineage links appear here. J/K moves between links, A accepts, R rejects, 1–8 picks a relation.</Empty>
        )}
      </Box>
      <Card borderLeft overflow="auto" style={{width: 320, flexShrink: 0}}>
        <Stack space={5} padding={4}>
          {paper && (
            <Boundary key={paper} label="Loading neighbourhood…">
              <Neighbourhood paperId={paper} />
            </Boundary>
          )}
          <Boundary label="Loading activity…">
            <Activity />
          </Boundary>
        </Stack>
      </Card>
    </>
  )
}

function Queue({selected, onSelect}: {selected: string | null; onSelect: (id: string) => void}) {
  const {data} = useQuery<QueueRow[]>({query: QUEUE})
  const total = data.reduce((n, r) => n + r.left, 0)
  return (
    <Stack space={1} padding={2}>
      <Box padding={2}>
        <Overline>
          {data.length} papers · {total} links to review
        </Overline>
      </Box>
      {data.length === 0 && <Empty title="All caught up">Every link has been reviewed.</Empty>}
      {data.map((r) => (
        <Card key={r._id} as="button" padding={3} radius={2} pressed={r._id === selected} selected={r._id === selected} onClick={() => onSelect(r._id)} style={{textAlign: 'left'}}>
          <Flex align="center" gap={2}>
            {r.low > 0 && <Text title="Has a low-confidence link">⚠</Text>}
            <Stack space={2} flex={1}>
              <Text size={1} weight="semibold" textOverflow="ellipsis">
                {r.shortName}
              </Text>
              <Text size={0} muted>
                {year(r.publishedAt)} · {r.method} cited in Method
              </Text>
            </Stack>
            <Badge tone={r.low ? 'caution' : 'default'}>{r.left}</Badge>
          </Flex>
        </Card>
      ))}
    </Stack>
  )
}

type Header = {shortName: string; publishedAt: string; total: number; accepted: number; left: number; high: {_id: string; relation: string | null; suggested: string; from: string}[]}

function PaperReview({paperId}: {paperId: string}) {
  const [showReviewed, setShowReviewed] = useState(false)
  return (
    <Stack space={4} padding={4}>
      <Boundary label="">
        <PaperHeader paperId={paperId} showReviewed={showReviewed} onToggle={() => setShowReviewed(!showReviewed)} />
      </Boundary>
      <Boundary label="Loading links…">
        <EdgeList paperId={paperId} showReviewed={showReviewed} />
      </Boundary>
    </Stack>
  )
}

function PaperHeader({paperId, showReviewed, onToggle}: {paperId: string; showReviewed: boolean; onToggle: () => void}) {
  const {data: h} = useQuery<Header | null>({query: HEADER, params: {id: paperId, high: HIGH_CONFIDENCE}})
  const decide = useReview()
  const undoToast = useUndoToast()
  const errorToast = useErrorToast()
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  if (!h) return null

  const acceptHigh = async () => {
    setBusy(true)
    try {
      const targets = h.high.map((l) => ({
        handle: createDocumentHandle({documentId: l._id, documentType: 'influence', projectId: PROJECT_ID, dataset: DATASET}),
        decision: 'proposed' as const,
        relation: l.relation,
      }))
      const byId = new Map(h.high.map((l) => [l._id, l]))
      const undo = await decide(targets, 'accepted', (t) => {
        const l = byId.get(t.handle.documentId)
        return l?.relation ?? l?.suggested
      })
      undoToast(`Accepted ${targets.length} high-confidence links`, undo)
    } catch (err) {
      errorToast('Batch accept failed', err)
    } finally {
      setBusy(false)
      setConfirm(false)
    }
  }

  return (
    <Stack space={4}>
      <Stack space={3}>
        <Text size={4} weight="semibold">
          {h.shortName} <span style={{opacity: 0.5, fontWeight: 400}}>({year(h.publishedAt)})</span>
        </Text>
        <Text muted size={1}>
          {h.total} incoming links · {h.accepted} accepted · {h.left} to review
        </Text>
      </Stack>
      <Card padding={3} radius={2} tone="transparent" border>
        <Flex align="center" gap={3} wrap="wrap">
          <Button
            tone="primary"
            text={`Accept all high-confidence (${h.high.length})`}
            disabled={!h.high.length || busy}
            onClick={() => setConfirm(true)}
          />
          <Text size={1} muted>
            confidence ≥ {HIGH_CONFIDENCE} and cited in Method
          </Text>
          <Box flex={1} />
          <Flex as="label" align="center" gap={2}>
            <Switch checked={showReviewed} onChange={onToggle} />
            <Text size={1}>Show reviewed</Text>
          </Flex>
        </Flex>
      </Card>
      {confirm && (
        <Dialog id="confirm-batch" header={`Accept ${h.high.length} links into ${h.shortName}?`} onClose={() => setConfirm(false)} width={1}>
          <Stack space={4} padding={4}>
            <Text size={1} muted>
              One transaction. Each link is published with the relation shown; Undo restores them.
            </Text>
            <Stack space={2}>
              {h.high.map((l) => (
                <Text key={l._id} size={1}>
                  {l.from} → {h.shortName} · <strong>{relationTitle(l.relation ?? l.suggested)}</strong>
                </Text>
              ))}
            </Stack>
            <Flex gap={2} justify="flex-end">
              <Button mode="ghost" text="Cancel" onClick={() => setConfirm(false)} />
              <Button tone="positive" text={busy ? 'Accepting…' : 'Accept all'} disabled={busy} onClick={acceptHigh} />
            </Flex>
          </Stack>
        </Dialog>
      )}
    </Stack>
  )
}

function EdgeList({paperId, showReviewed}: {paperId: string; showReviewed: boolean}) {
  const {data, hasMore, loadMore} = useDocuments({
    documentType: 'influence',
    filter: showReviewed ? 'to._ref == $paper' : 'to._ref == $paper && provenance.reviewDecision == "proposed"',
    params: {paper: paperId},
    orderings: [
      {field: 'citation.methodMentions', direction: 'desc'},
      {field: 'citation.mentions', direction: 'desc'},
    ],
    batchSize: 20,
  })
  const [focus, setFocus] = useState(0)
  const at = Math.min(focus, Math.max(data.length - 1, 0))
  useKeys({j: () => setFocus(Math.min(at + 1, data.length - 1)), k: () => setFocus(Math.max(at - 1, 0))})

  if (!data.length) return <Empty title="Nothing left to review here">Toggle “Show reviewed” to revisit decisions.</Empty>
  return (
    <Stack space={3}>
      {data.map((handle: DocumentHandle, i: number) => (
        <Boundary key={handle.documentId} label="">
          <EdgeCard handle={handle} focused={i === at} onFocus={() => setFocus(i)} />
        </Boundary>
      ))}
      {hasMore && <Button mode="ghost" text="Load more" onClick={loadMore} />}
    </Stack>
  )
}

type Hood = {shortName: string; incoming: {_id: string; from: string; decision: string; relation: string | null}[]; outgoing: {_id: string; to: string; decision: string}[]}

/** 2-hop preview as a list: accepted solid, proposed dashed (DESIGN_SPEC §10.2 context pane). */
function Neighbourhood({paperId}: {paperId: string}) {
  const {data} = useQuery<Hood | null>({query: HOOD, params: {id: paperId}})
  if (!data) return null
  const line = (decision: string) => ({
    display: 'inline-block',
    width: 22,
    borderTop: decision === 'accepted' ? '2px solid #3446C4' : '2px dashed #7E848E',
    verticalAlign: 'middle',
    marginRight: 8,
  })
  return (
    <Stack space={3}>
      <Overline>Built on</Overline>
      {data.incoming.map((l) => (
        <Text key={l._id} size={1}>
          <span style={line(l.decision)} />
          {l.from}
          {l.decision === 'accepted' && l.relation && <span style={{opacity: 0.6}}> · {relationTitle(l.relation)}</span>}
        </Text>
      ))}
      <Text size={1} weight="semibold">
        ↓ {data.shortName}
      </Text>
      {data.outgoing.length > 0 && <Overline>Led to</Overline>}
      {data.outgoing.map((l) => (
        <Text key={l._id} size={1}>
          <span style={line(l.decision)} />
          {l.to}
        </Text>
      ))}
    </Stack>
  )
}

type Act = {_id: string; from: string; to: string; decision: string; by: string; at: string}

function Activity() {
  const {data} = useQuery<Act[]>({query: ACTIVITY})
  return (
    <Stack space={3}>
      <Overline>Live activity</Overline>
      {data.length === 0 && (
        <Text size={1} muted>
          No reviews yet.
        </Text>
      )}
      {data.map((a) => (
        <Text key={a._id} size={1}>
          <strong>{a.by}</strong> {a.decision} {a.from} → {a.to} <span style={{opacity: 0.6}}>· {ago(a.at)}</span>
        </Text>
      ))}
    </Stack>
  )
}
