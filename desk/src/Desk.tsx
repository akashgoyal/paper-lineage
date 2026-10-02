import {useCurrentUser, usePresence, useQuery} from '@sanity/sdk-react'
import {Avatar, AvatarStack, Badge, Box, Button, Card, Dialog, Flex, Stack, Tab, TabList, Text} from '@sanity/ui'
import {useEffect, useState} from 'react'
import {ComposerTab} from './composer/ComposerTab'
import {InboxTab} from './inbox/InboxTab'
import {DATASET} from './lib/model'
import {useKeys} from './lib/keys'
import {Boundary} from './lib/ui'
import {PipelineTab} from './pipeline/PipelineTab'
import {ReviewTab} from './review/ReviewTab'

const TABS = [
  {id: 'review', title: 'Review', chord: 'r'},
  {id: 'inbox', title: 'Inbox', chord: 'i'},
  {id: 'composer', title: 'Composer', chord: 'c'},
  {id: 'pipeline', title: 'Pipeline', chord: 'p'},
] as const
type TabId = (typeof TABS)[number]['id']

const SHORTCUTS: [string, string][] = [
  ['J / K', 'Next / previous link'],
  ['A', 'Accept the focused link'],
  ['R', 'Reject the focused link'],
  ['1–8', 'Choose a relation'],
  ['E', 'Focus the relation list'],
  ['W', 'Write explanation (Agent Action)'],
  ['O', 'Open in Studio'],
  ['G then R / I / C / P', 'Review · Inbox · Composer · Pipeline'],
  ['?', 'This help'],
]

export function Desk() {
  const [tab, setTab] = useState<TabId>('review')
  const [help, setHelp] = useState(false)
  const [storyPrefill, setStoryPrefill] = useState<string | null>(null)

  // "G then X" chords run in the capture phase, so the second key never reaches card shortcuts (G, R ≠ reject).
  useEffect(() => {
    let armed = 0
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || e.metaKey || e.ctrlKey || e.altKey) return
      if (Date.now() - armed < 1200) {
        const hit = TABS.find((x) => x.chord === e.key.toLowerCase())
        armed = 0
        if (hit) {
          e.preventDefault()
          e.stopImmediatePropagation()
          setTab(hit.id)
        }
        return
      }
      if (e.key.toLowerCase() === 'g') {
        armed = Date.now()
        e.stopImmediatePropagation()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])
  useKeys({'?': () => setHelp(true)})

  return (
    <Flex direction="column" style={{height: '100vh'}}>
      <Card borderBottom paddingX={4} style={{height: 52, flexShrink: 0}}>
        <Flex align="center" gap={4} style={{height: '100%'}}>
          <Text weight="semibold">Lineage Desk</Text>
          <Badge mode="outline">{DATASET}</Badge>
          <TabList space={1}>
            {TABS.map((t) => (
              <Tab key={t.id} id={`tab-${t.id}`} aria-controls={`panel-${t.id}`} label={t.title} selected={tab === t.id} onClick={() => setTab(t.id)} />
            ))}
          </TabList>
          <Box flex={1} />
          <Boundary label="">
            <VerifiedCount />
          </Boundary>
          <Boundary label="">
            <People />
          </Boundary>
          <Button mode="bleed" text="?" onClick={() => setHelp(true)} aria-label="Keyboard shortcuts" />
        </Flex>
      </Card>
      <Flex flex={1} style={{minHeight: 0}} id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === 'review' && <ReviewTab />}
        {tab === 'inbox' && (
          <InboxTab
            onWriteStory={(title) => {
              setStoryPrefill(title)
              setTab('composer')
            }}
          />
        )}
        {tab === 'composer' && <ComposerTab prefill={storyPrefill} onPrefillUsed={() => setStoryPrefill(null)} />}
        {tab === 'pipeline' && <PipelineTab />}
      </Flex>
      {help && (
        <Dialog id="help" header="Keyboard shortcuts" onClose={() => setHelp(false)} width={1}>
          <Stack space={3} padding={4}>
            {SHORTCUTS.map(([k, v]) => (
              <Flex key={k} gap={3}>
                <Box style={{width: 150}}>
                  <Text size={1} weight="semibold" style={{fontFamily: 'monospace'}}>
                    {k}
                  </Text>
                </Box>
                <Text size={1}>{v}</Text>
              </Flex>
            ))}
          </Stack>
        </Dialog>
      )}
    </Flex>
  )
}

function VerifiedCount() {
  const {data} = useQuery<{accepted: number; total: number}>({
    query: `{"accepted": count(*[_type == "influence" && provenance.reviewDecision == "accepted"]), "total": count(*[_type == "influence"])}`,
    perspective: 'published',
  })
  return (
    <Text size={1} muted>
      <strong>{data.accepted}</strong> / {data.total.toLocaleString('en-US')} links verified
    </Text>
  )
}

/** Who else is curating right now (presence across the project), plus me. */
function People() {
  const me = useCurrentUser()
  const {locations} = usePresence()
  const others = [...new Map(locations.filter((p) => p.user?.sanityUserId !== me?.id).map((p) => [p.user?.sanityUserId, p.user])).values()]
  return (
    <AvatarStack maxLength={4} size={1}>
      {me && <Avatar src={me.profileImage} title={`${me.name} (you)`} size={1} />}
      {others.map((u) => (
        <Avatar key={u?.sanityUserId} src={u?.profile?.imageUrl} title={u?.profile?.displayName} size={1} />
      ))}
    </AvatarStack>
  )
}
