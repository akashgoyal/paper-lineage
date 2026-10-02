import {
  createDocument,
  createDocumentHandle,
  editDocument,
  publishDocument,
  useApplyDocumentActions,
  useQuery,
} from '@sanity/sdk-react'
import {Badge, Box, Button, Card, Flex, Stack, Text, TextArea} from '@sanity/ui'
import {useState} from 'react'
import {DATASET, PROJECT_ID, ago, openInStudio} from '../lib/model'
import {Boundary, Empty, Overline, useErrorToast, useUndoToast} from '../lib/ui'
import {subjectField, usePaperIntakeEngine} from '../workflow/engine'
import {GAPS, GAP, QUESTIONS} from '../lib/queries'

type GapKind = 'missing-link' | 'missing-paper' | 'unanswered' | 'weak-evidence'
type GapStatus = 'open' | 'in-progress' | 'resolved' | 'wont-fix'
type GapRow = {_id: string; kind: GapKind; title: string; status: GapStatus; questionCount: number}

const KIND: Record<GapKind, {label: string; tone: 'caution' | 'primary' | 'critical' | 'default'}> = {
  'missing-link': {label: 'Missing link', tone: 'primary'},
  'missing-paper': {label: 'Missing paper', tone: 'caution'},
  unanswered: {label: 'Unanswered', tone: 'critical'},
  'weak-evidence': {label: 'Weak evidence', tone: 'default'},
}

export function InboxTab({onWriteStory}: {onWriteStory: (title: string) => void}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [closed, setClosed] = useState(false)
  return (
    <>
      <Card borderRight overflow="auto" style={{width: 270, flexShrink: 0}}>
        <Stack space={2} padding={2}>
          <Flex gap={1} padding={1}>
            <Button mode={closed ? 'bleed' : 'default'} fontSize={1} padding={2} text="Open" onClick={() => setClosed(false)} />
            <Button mode={closed ? 'default' : 'bleed'} fontSize={1} padding={2} text="Closed" onClick={() => setClosed(true)} />
          </Flex>
          <Boundary label="Loading gaps…">
            <GapList statuses={closed ? ['resolved', 'wont-fix'] : ['open', 'in-progress']} selected={selected} onSelect={setSelected} />
          </Boundary>
        </Stack>
      </Card>
      <Box flex={1} overflow="auto">
        {selected ? (
          <Boundary key={selected} label="Loading gap…">
            <GapDetail id={selected} onWriteStory={onWriteStory} />
          </Boundary>
        ) : (
          <Empty title="Questions the site could not answer well">
            Each gap groups visitor questions (and suggestions) by what is missing. Pick one to act on it.
          </Empty>
        )}
      </Box>
      <Card borderLeft overflow="auto" style={{width: 320, flexShrink: 0}}>
        <Boundary label="Loading questions…">
          <QuestionFeed />
        </Boundary>
      </Card>
    </>
  )
}

function GapList({statuses, selected, onSelect}: {statuses: GapStatus[]; selected: string | null; onSelect: (id: string) => void}) {
  const {data} = useQuery<GapRow[]>({query: GAPS, params: {statuses}})
  if (!data.length) return <Empty title="Inbox zero">No gaps here.</Empty>
  return (
    <Stack space={1}>
      {data.map((g) => (
        <Card key={g._id} as="button" padding={3} radius={2} selected={g._id === selected} pressed={g._id === selected} onClick={() => onSelect(g._id)} style={{textAlign: 'left'}}>
          <Stack space={2}>
            <Flex gap={2} align="center">
              <Badge tone={KIND[g.kind]?.tone}>{KIND[g.kind]?.label ?? g.kind}</Badge>
              {g.status === 'in-progress' && <Badge>In progress</Badge>}
              <Box flex={1} />
              <Text size={1} muted>
                {g.questionCount}
              </Text>
            </Flex>
            <Text size={1} textOverflow="ellipsis">
              {g.title}
            </Text>
          </Stack>
        </Card>
      ))}
    </Stack>
  )
}

type Gap = GapRow & {
  detail?: string
  resolution?: string
  suggestedArxivIds?: string[]
  papers: {_id: string; shortName: string}[]
  questions: {_id: string; text: string; outcome: string; askedAt: string}[]
  existing: {arxivId: string; _id: string}[]
}

function GapDetail({id, onWriteStory}: {id: string; onWriteStory: (title: string) => void}) {
  const {data: g} = useQuery<Gap | null>({query: GAP, params: {id}})
  const apply = useApplyDocumentActions()
  const undoToast = useUndoToast()
  const errorToast = useErrorToast()
  const [note, setNote] = useState('')
  const engine = usePaperIntakeEngine()
  const handle = createDocumentHandle({documentId: id, documentType: 'gap', projectId: PROJECT_ID, dataset: DATASET})
  if (!g) return <Empty title="This gap no longer exists" />

  const setStatus = async (status: GapStatus, resolution?: string) => {
    const prev = {status: g.status, resolution: g.resolution}
    try {
      await apply([editDocument(handle, {set: {status, ...(resolution ? {resolution} : {})}}), publishDocument(handle)])
      undoToast(`Gap marked ${status}`, () =>
        apply([editDocument(handle, prev.resolution ? {set: prev} : [{set: {status: prev.status}}, {unset: ['resolution']}]), publishDocument(handle)]),
      )
      setNote('')
    } catch (err) {
      errorToast('Could not update the gap', err)
    }
  }

  // Curators create papers (DESIGN_SPEC §6.7): a draft with the arXiv id, then the paper-intake workflow
  // fetches its metadata, counts its links and waits for a curator's approval in the Pipeline tab.
  const addPaper = async (arxivId: string) => {
    const paperId = `paper-${arxivId.replace(/[^0-9a-z]/gi, '-')}`
    const paper = createDocumentHandle({documentId: paperId, documentType: 'paper', projectId: PROJECT_ID, dataset: DATASET})
    try {
      await apply([
        createDocument(paper),
        editDocument(paper, {set: {arxivId, title: `arXiv:${arxivId}`, shortName: arxivId, slug: {_type: 'slug', current: arxivId.replace('.', '-')}}}),
        editDocument(handle, {set: {status: 'in-progress'}}),
        publishDocument(handle),
      ])
      await engine.startInstance({definition: 'paper-intake', initialFields: [subjectField(paperId)]})
      undoToast(`Draft paper ${arxivId} created · intake started (see Pipeline)`)
    } catch (err) {
      errorToast('Could not create the paper', err)
    }
  }

  const existing = new Map(g.existing.map((p) => [p.arxivId, p._id]))
  return (
    <Stack space={5} padding={4}>
      <Stack space={3}>
        <Flex gap={2}>
          <Badge tone={KIND[g.kind]?.tone}>{KIND[g.kind]?.label}</Badge>
          <Badge>{g.status}</Badge>
          <Badge mode="outline">{g.questionCount} questions</Badge>
        </Flex>
        <Text size={3} weight="semibold">
          {g.title}
        </Text>
        {g.detail && (
          <Text size={1} muted>
            {g.detail}
          </Text>
        )}
      </Stack>

      {g.questions.length > 0 && (
        <Stack space={2}>
          <Overline>Example questions</Overline>
          {g.questions.map((q) => (
            <Card key={q._id} padding={3} radius={2} border>
              <Stack space={2}>
                <Text size={1}>“{q.text}”</Text>
                <Text size={0} muted>
                  {q.outcome} · {ago(q.askedAt)}
                </Text>
              </Stack>
            </Card>
          ))}
        </Stack>
      )}

      {g.papers?.length > 0 && (
        <Stack space={2}>
          <Overline>Related papers</Overline>
          <Flex gap={2} wrap="wrap">
            {g.papers.map((p) => (
              <Boundary key={p._id} label="">
                <PaperChip id={p._id} name={p.shortName} />
              </Boundary>
            ))}
          </Flex>
        </Stack>
      )}

      {g.kind === 'missing-paper' && (
        <Stack space={2}>
          <Overline>Papers to add</Overline>
          {(g.suggestedArxivIds ?? []).map((a) => (
            <Flex key={a} gap={3} align="center">
              <Text size={1} style={{fontFamily: 'monospace'}}>
                <a href={`https://arxiv.org/abs/${a}`} target="_blank" rel="noreferrer">
                  {a}
                </a>
              </Text>
              {existing.has(a) ? (
                <Badge tone="positive">Already in the dataset</Badge>
              ) : (
                <Button fontSize={1} padding={2} tone="primary" text="Add paper" onClick={() => addPaper(a)} />
              )}
            </Flex>
          ))}
        </Stack>
      )}

      <Card padding={4} radius={2} border tone="transparent">
        <Stack space={3}>
          <Overline>Act</Overline>
          <Flex gap={2} wrap="wrap">
            {g.kind === 'unanswered' && <Button tone="primary" text="Write storyline" onClick={() => onWriteStory(g.title)} />}
            {g.status === 'open' && <Button mode="ghost" text="Mark in progress" onClick={() => setStatus('in-progress')} />}
            {(g.status === 'resolved' || g.status === 'wont-fix') && <Button mode="ghost" text="Reopen" onClick={() => setStatus('open')} />}
          </Flex>
          <TextArea rows={2} value={note} placeholder="Resolution note (required to resolve or close)" onChange={(e) => setNote(e.currentTarget.value)} />
          <Flex gap={2}>
            <Button tone="positive" text="Resolve" disabled={!note.trim()} onClick={() => setStatus('resolved', note.trim())} />
            <Button tone="critical" mode="ghost" text="Out of scope" disabled={!note.trim()} onClick={() => setStatus('wont-fix', note.trim())} />
          </Flex>
        </Stack>
      </Card>
    </Stack>
  )
}

function PaperChip({id, name}: {id: string; name: string}) {
  return <Button mode="ghost" fontSize={1} padding={2} text={name} onClick={() => openInStudio(id, 'paper')} />
}

type Q = {_id: string; text: string; outcome: string; askedAt: string}

function QuestionFeed() {
  const {data} = useQuery<Q[]>({query: QUESTIONS})
  const tone = (o: string) => (o === 'answered' ? 'positive' : o === 'partial' ? 'caution' : 'critical')
  return (
    <Stack space={3} padding={4}>
      <Overline>Live questions</Overline>
      {data.length === 0 && (
        <Text size={1} muted>
          No visitor questions yet.
        </Text>
      )}
      {data.map((q) => (
        <Stack key={q._id} space={2}>
          <Text size={1}>{q.text}</Text>
          <Flex gap={2} align="center">
            <Badge tone={tone(q.outcome)}>{q.outcome}</Badge>
            <Text size={0} muted>
              {ago(q.askedAt)}
            </Text>
          </Flex>
        </Stack>
      ))}
    </Stack>
  )
}
