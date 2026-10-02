import {
  createDocument,
  createDocumentHandle,
  editDocument,
  publishDocument,
  useApplyDocumentActions,
  useDocument,
  useDocumentProjection,
  useEditDocument,
  useQuery,
  type DocumentHandle,
} from '@sanity/sdk-react'
import {Badge, Box, Button, Card, Flex, Stack, Text, TextArea, TextInput, Tooltip} from '@sanity/ui'
import {useEffect, useState} from 'react'
import {DATASET, PROJECT_ID, ago, openInStudio, relationTitle, year} from '../lib/model'
import {Boundary, Empty, Overline, useErrorToast, useUndoToast} from '../lib/ui'
import {STORIES, STORY_PROJECTION} from '../lib/queries'

const storyHandle = (id: string) =>
  createDocumentHandle({documentId: id.replace(/^drafts\./, ''), documentType: 'storyline', projectId: PROJECT_ID, dataset: DATASET})
const key = () => Math.random().toString(36).slice(2, 10)

type Row = {_id: string; title?: string; origin?: string; steps: number; draft: boolean; published: boolean; _updatedAt: string}

export function ComposerTab({prefill, onPrefillUsed}: {prefill: string | null; onPrefillUsed: () => void}) {
  const [selected, setSelected] = useState<string | null>(null)
  const apply = useApplyDocumentActions()
  const errorToast = useErrorToast()

  const create = async (title = 'Untitled storyline') => {
    const handle = storyHandle(`storyline-${crypto.randomUUID()}`)
    try {
      await apply([createDocument(handle), editDocument(handle, {set: {title, origin: 'curator', steps: []}})])
      setSelected(handle.documentId)
    } catch (err) {
      errorToast('Could not create the storyline', err)
    }
  }

  // "Write storyline" from the Inbox arrives here with the gap title as a starting point.
  useEffect(() => {
    if (!prefill) return
    onPrefillUsed()
    void create(prefill.slice(0, 80))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill])

  return (
    <>
      <Card borderRight overflow="auto" style={{width: 270, flexShrink: 0}}>
        <Stack space={2} padding={2}>
          <Button tone="primary" text="New storyline" onClick={() => create()} />
          <Boundary label="Loading storylines…">
            <StoryList selected={selected} onSelect={setSelected} />
          </Boundary>
        </Stack>
      </Card>
      {selected ? (
        <Boundary key={selected} label="Loading storyline…">
          <Editor handle={storyHandle(selected)} />
        </Boundary>
      ) : (
        <Box flex={1}>
          <Empty title="Storylines are curated walks through verified links">
            Drafts sent from the Ask chat show a “From chat” badge. Only accepted links can be steps, and a story publishes only when every step is verified.
          </Empty>
        </Box>
      )}
    </>
  )
}

function StoryList({selected, onSelect}: {selected: string | null; onSelect: (id: string) => void}) {
  const {data} = useQuery<Row[]>({query: STORIES})
  if (!data.length) return <Empty title="No storylines yet" />
  return (
    <Stack space={1}>
      {data.map((s) => (
        <Card key={s._id} as="button" padding={3} radius={2} selected={s._id === selected} pressed={s._id === selected} onClick={() => onSelect(s._id)} style={{textAlign: 'left'}}>
          <Stack space={2}>
            <Text size={1} weight="semibold" textOverflow="ellipsis">
              {s.title || 'Untitled'}
            </Text>
            <Flex gap={1} wrap="wrap">
              {s.origin === 'ai' && <Badge tone="primary">From chat</Badge>}
              {s.draft && <Badge tone="caution">{s.published ? 'Changed' : 'Draft'}</Badge>}
              {!s.draft && <Badge tone="positive">Published</Badge>}
              <Text size={0} muted>
                {s.steps ?? 0} steps · {ago(s._updatedAt)}
              </Text>
            </Flex>
          </Stack>
        </Card>
      ))}
    </Stack>
  )
}

type Block = {_type: 'block'; _key: string; style?: string; markDefs?: unknown[]; children: {_type: 'span'; _key: string; text: string; marks?: string[]}[]}
type RawStep = {_key: string; _type?: string; influence?: {_type?: 'reference'; _ref: string}; narrative?: Block[]}
type StepView = {_key: string; linkId: string | null; from?: string; fromYear?: string; to?: string; decision?: string; relation?: string | null}
type Story = {title?: string; slug?: {current?: string}; raw: RawStep[] | null; steps: StepView[] | null}

const toBlocks = (text: string): Block[] =>
  text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => ({_type: 'block', _key: key(), style: 'normal', markDefs: [], children: [{_type: 'span', _key: key(), text: p, marks: []}]}))
const toText = (blocks?: Block[]) => (blocks ?? []).map((b) => b.children?.map((c) => c.text).join('') ?? '').join('\n\n')
const hasMentions = (blocks?: Block[]) => (blocks ?? []).some((b) => (b.markDefs?.length ?? 0) > 0)
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)

function Editor({handle}: {handle: DocumentHandle}) {
  const {data: story} = useDocumentProjection<Story>({...handle, projection: STORY_PROJECTION})
  const apply = useApplyDocumentActions()
  const undoToast = useUndoToast()
  const errorToast = useErrorToast()
  const navigateToStudioDocument = () => openInStudio(handle.documentId, 'storyline')
  if (!story) return <Empty title="This storyline was deleted" />

  const raw = story.raw ?? []
  const steps = story.steps ?? []
  const setSteps = (next: RawStep[]) => apply(editDocument(handle, {set: {steps: next}})).catch((err) => errorToast('Could not update the steps', err))
  const move = (i: number, d: -1 | 1) => {
    const next = [...raw]
    ;[next[i], next[i + d]] = [next[i + d], next[i]]
    void setSteps(next)
  }
  const remove = (i: number) => {
    const before = raw
    void setSteps(raw.filter((_, j) => j !== i)).then(() => undoToast('Step removed', () => setSteps(before)))
  }
  const setNarrative = (i: number, text: string) => setSteps(raw.map((s, j) => (j === i ? {...s, narrative: toBlocks(text)} : s)))
  const addStep = (linkId: string) => setSteps([...raw, {_key: key(), _type: 'step', influence: {_type: 'reference', _ref: linkId}}])

  const unreviewed = steps.filter((s) => s.decision !== 'accepted')
  const blocker = !story.title?.trim()
    ? 'Add a title'
    : !steps.length
      ? 'Add at least one step'
      : unreviewed.length
        ? `${unreviewed.length} step${unreviewed.length > 1 ? 's use' : ' uses'} an unreviewed link: review it first`
        : null

  const publish = async () => {
    try {
      await apply([
        ...(story.slug?.current ? [] : [editDocument(handle, {set: {slug: {_type: 'slug', current: slugify(story.title ?? '')}}})]),
        publishDocument(handle),
      ])
      undoToast('Storyline published · it appears on the site within seconds')
    } catch (err) {
      errorToast('Publish failed', err)
    }
  }

  return (
    <>
      <Box flex={1} overflow="auto">
        <Stack space={5} padding={4}>
          <Boundary label="">
            <StringField handle={handle} path="title" label="Title" max={100} large />
          </Boundary>
          <Boundary label="">
            <StringField handle={handle} path="dek" label="Standfirst" max={160} />
          </Boundary>
          <Stack space={3}>
            <Overline>Steps</Overline>
            {!steps.length && (
              <Text size={1} muted>
                Add steps from the panel on the right. Only verified links are offered.
              </Text>
            )}
            {steps.map((s, i) => (
              <Card key={s._key} padding={3} radius={2} border tone={s.decision === 'accepted' ? 'default' : 'caution'}>
                <Stack space={3}>
                  <Flex align="center" gap={2}>
                    <Text size={1} weight="semibold">
                      {i + 1}. {s.from ?? '?'} ({year(s.fromYear)}) → {s.to ?? '?'}
                    </Text>
                    {s.decision === 'accepted' ? <Badge tone="positive">{relationTitle(s.relation)}</Badge> : <Badge tone="caution">Review this link first</Badge>}
                    <Box flex={1} />
                    <Button mode="bleed" padding={2} text="↑" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up" />
                    <Button mode="bleed" padding={2} text="↓" disabled={i === steps.length - 1} onClick={() => move(i, 1)} aria-label="Move down" />
                    <Button mode="bleed" tone="critical" padding={2} text="Remove" onClick={() => remove(i)} />
                  </Flex>
                  {hasMentions(raw[i]?.narrative) ? (
                    <Flex gap={2} align="center">
                      <Text size={1} muted>
                        {toText(raw[i]?.narrative).slice(0, 160)}…
                      </Text>
                      <Button mode="ghost" fontSize={1} padding={2} text="Edit in Studio (has mentions)" onClick={navigateToStudioDocument} />
                    </Flex>
                  ) : (
                    <NarrativeField key={toText(raw[i]?.narrative)} value={toText(raw[i]?.narrative)} onCommit={(t) => setNarrative(i, t)} />
                  )}
                </Stack>
              </Card>
            ))}
          </Stack>
          <Flex gap={2} align="center">
            <Tooltip content={<Box padding={2}><Text size={1}>{blocker ?? 'Publish to the site'}</Text></Box>} portal>
              <span>
                <Button tone="positive" text="Publish" disabled={!!blocker} onClick={publish} />
              </span>
            </Tooltip>
            {blocker && (
              <Text size={1} muted>
                {blocker}
              </Text>
            )}
            <Box flex={1} />
            <Button mode="bleed" text="Open in Studio" onClick={navigateToStudioDocument} />
          </Flex>
        </Stack>
      </Box>
      <Card borderLeft overflow="auto" style={{width: 320, flexShrink: 0}}>
        <Stack space={5} padding={4}>
          <ChainPreview steps={steps} />
          <Boundary label="">
            <StepPicker onAdd={addStep} taken={new Set(steps.map((s) => s.linkId ?? ''))} />
          </Boundary>
        </Stack>
      </Card>
    </>
  )
}

/** Title / standfirst: written through useEditDocument on every change, as the App SDK recommends. */
function StringField({handle, path, label, max, large}: {handle: DocumentHandle; path: 'title' | 'dek'; label: string; max: number; large?: boolean}) {
  const {data} = useDocument<string | undefined>({...handle, path})
  const edit = useEditDocument<string | undefined>({...handle, path})
  return (
    <Stack space={2}>
      <Text size={1} muted>
        {label}
      </Text>
      <TextInput fontSize={large ? 3 : 2} value={data ?? ''} maxLength={max} onChange={(e) => void edit(e.currentTarget.value)} />
    </Stack>
  )
}

function NarrativeField({value, onCommit}: {value: string; onCommit: (text: string) => Promise<unknown>}) {
  const [draft, setDraft] = useState(value)
  return (
    <TextArea
      rows={3}
      value={draft}
      placeholder="Narrative for this step (blank line = new paragraph). Add paper/concept mentions in Studio."
      onChange={(e) => setDraft(e.currentTarget.value)}
      onBlur={() => draft !== value && void onCommit(draft)}
    />
  )
}

function ChainPreview({steps}: {steps: StepView[]}) {
  return (
    <Stack space={3}>
      <Overline>Chain preview</Overline>
      {!steps.length && (
        <Text size={1} muted>
          Empty
        </Text>
      )}
      {steps.map((s, i) => (
        <Stack key={s._key} space={2}>
          {i === 0 && (
            <Text size={1} weight="semibold">
              {s.from} <span style={{opacity: 0.5}}>{year(s.fromYear)}</span>
            </Text>
          )}
          <Text size={0} muted style={{paddingLeft: 8, borderLeft: s.decision === 'accepted' ? '2px solid #3446C4' : '2px dashed #7E848E'}}>
            {s.decision === 'accepted' ? relationTitle(s.relation) : 'unreviewed'}
          </Text>
          <Text size={1} weight="semibold">
            {s.to}
          </Text>
        </Stack>
      ))}
    </Stack>
  )
}

type Pick = {_id: string; shortName: string; publishedAt: string}
type Out = {_id: string; to: string; toYear: string; relation: string}

function StepPicker({onAdd, taken}: {onAdd: (linkId: string) => Promise<unknown>; taken: Set<string>}) {
  const [q, setQ] = useState('')
  const [paper, setPaper] = useState<Pick | null>(null)
  return (
    <Stack space={3}>
      <Overline>Add step</Overline>
      {paper ? (
        <Stack space={2}>
          <Flex align="center" gap={2}>
            <Text size={1}>
              From <strong>{paper.shortName}</strong>
            </Text>
            <Button mode="bleed" fontSize={1} padding={2} text="Change" onClick={() => setPaper(null)} />
          </Flex>
          <Boundary key={paper._id} label="">
            <OutgoingLinks paperId={paper._id} taken={taken} onAdd={onAdd} />
          </Boundary>
        </Stack>
      ) : (
        <>
          <TextInput value={q} placeholder="Search the earlier paper…" onChange={(e) => setQ(e.currentTarget.value)} />
          {q.trim().length >= 2 && (
            <Boundary label="">
              <PaperSearch q={q.trim()} onPick={setPaper} />
            </Boundary>
          )}
        </>
      )}
    </Stack>
  )
}

function PaperSearch({q, onPick}: {q: string; onPick: (p: Pick) => void}) {
  const {data} = useQuery<Pick[]>({
    query: `*[_type == "paper" && (shortName match $q || title match $q)] | order(publishedAt asc)[0...8]{_id, shortName, publishedAt}`,
    params: {q: q.split(/\s+/).map((w) => `${w}*`)},
  })
  if (!data.length)
    return (
      <Text size={1} muted>
        No paper matches.
      </Text>
    )
  return (
    <Stack space={1}>
      {data.map((p) => (
        <Button key={p._id} mode="bleed" justify="flex-start" text={`${p.shortName} · ${year(p.publishedAt)}`} onClick={() => onPick(p)} />
      ))}
    </Stack>
  )
}

function OutgoingLinks({paperId, taken, onAdd}: {paperId: string; taken: Set<string>; onAdd: (linkId: string) => Promise<unknown>}) {
  const {data} = useQuery<Out[]>({
    query: `*[_type == "influence" && from._ref == $id && provenance.reviewDecision == "accepted"] | order(to->publishedAt asc){
      "_id": string::split(_id, "drafts.")[-1], "to": to->shortName, "toYear": to->publishedAt, relation
    }`,
    params: {id: paperId},
  })
  if (!data.length)
    return (
      <Text size={1} muted>
        No verified links from this paper yet. Review them first.
      </Text>
    )
  return (
    <Stack space={1}>
      {data.map((l) => (
        <Button
          key={l._id}
          mode="ghost"
          justify="flex-start"
          disabled={taken.has(l._id)}
          text={`→ ${l.to} (${year(l.toYear)}) · ${relationTitle(l.relation)}`}
          onClick={() => void onAdd(l._id)}
        />
      ))}
    </Stack>
  )
}
