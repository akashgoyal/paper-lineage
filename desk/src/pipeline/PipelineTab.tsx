import {useQuery} from '@sanity/sdk-react'
import {Badge, Box, Card, Flex, Grid, Stack, Text} from '@sanity/ui'
import {ago, relationTitle} from '../lib/model'
import {Boundary, Overline} from '../lib/ui'
import {IntakePanel} from '../workflow/IntakePanel'
import {PIPELINE} from '../lib/queries'

type Pipeline = {
  papers: number
  links: {proposed: number; accepted: number; rejected: number; drafts: number}
  method: number
  high: number
  gaps: {open: number; progress: number}
  questions: {total: number; unanswered: number; partial: number}
  storylines: {published: number; drafts: number}
  intake: {_id: string; shortName: string; arxivId: string; _updatedAt: string}[]
  recent: {_id: string; from: string; to: string; decision: string; relation: string | null; by: string; at: string}[]
}

export function PipelineTab() {
  return (
    <Box flex={1} overflow="auto">
      <Stack space={5} padding={4}>
        <Boundary label="Loading workflow…">
          <IntakePanel />
        </Boundary>
      </Stack>
      <Boundary label="Loading pipeline…">
        <Board />
      </Boundary>
    </Box>
  )
}

function Stat({value, label, tone}: {value: number; label: string; tone?: 'caution' | 'positive' | 'critical'}) {
  return (
    <Card padding={4} radius={2} border tone={tone ?? 'default'}>
      <Stack space={3}>
        <Text size={4} weight="semibold">
          {value.toLocaleString('en-US')}
        </Text>
        <Text size={1} muted>
          {label}
        </Text>
      </Stack>
    </Card>
  )
}

function Board() {
  const {data: p} = useQuery<Pipeline>({query: PIPELINE, perspective: 'raw'})
  const reviewed = p.links.accepted + p.links.rejected
  const total = reviewed + p.links.proposed
  return (
    <Stack space={5} padding={4}>
      <Stack space={3}>
        <Text size={3} weight="semibold">
          Pipeline
        </Text>
        <Text size={1} muted>
          Harvest → review → verified on the site. {Math.round((100 * reviewed) / Math.max(total, 1))}% of {total.toLocaleString('en-US')} links reviewed.
        </Text>
        <div style={{height: 8, borderRadius: 4, background: 'var(--card-border-color)', overflow: 'hidden', display: 'flex'}}>
          <div style={{width: `${(100 * p.links.accepted) / Math.max(total, 1)}%`, background: '#3446C4'}} />
          <div style={{width: `${(100 * p.links.rejected) / Math.max(total, 1)}%`, background: '#A21C5B'}} />
        </div>
      </Stack>
      <Grid columns={[2, 3, 4]} gap={3}>
        <Stat value={p.links.proposed} label="Links to review" tone="caution" />
        <Stat value={p.method} label="…of which cited in Method" />
        <Stat value={p.high} label="…high confidence (one-click triage)" />
        <Stat value={p.links.accepted} label="Verified links" tone="positive" />
        <Stat value={p.links.rejected} label="Rejected links" />
        <Stat value={p.links.drafts} label="Links with unpublished edits" />
        <Stat value={p.gaps.open + p.gaps.progress} label={`Open gaps (${p.gaps.progress} in progress)`} tone={p.gaps.open ? 'critical' : undefined} />
        <Stat value={p.questions.total} label={`Visitor questions (${p.questions.unanswered} unanswered, ${p.questions.partial} partial)`} />
        <Stat value={p.papers} label="Published papers" />
        <Stat value={p.storylines.published} label={`Storylines (${p.storylines.drafts} drafts)`} />
      </Grid>
      <Grid columns={[1, 1, 2]} gap={4}>
        <Stack space={3}>
          <Overline>Intake: draft papers awaiting harvest</Overline>
          {p.intake.length === 0 && (
            <Text size={1} muted>
              None. Add papers from Inbox gaps or in Studio.
            </Text>
          )}
          {p.intake.map((d) => (
            <Flex key={d._id} gap={2} align="center">
              <Text size={1}>{d.shortName ?? d.arxivId}</Text>
              <Badge tone="caution">draft</Badge>
              <Text size={0} muted>
                {ago(d._updatedAt)}
              </Text>
            </Flex>
          ))}
        </Stack>
        <Stack space={3}>
          <Overline>Recent decisions</Overline>
          {p.recent.length === 0 && (
            <Text size={1} muted>
              No reviews yet.
            </Text>
          )}
          {p.recent.map((r) => (
            <Text key={r._id} size={1}>
              {r.from} → {r.to} · <strong>{r.decision === 'accepted' ? relationTitle(r.relation) : r.decision}</strong>{' '}
              <span style={{opacity: 0.6}}>
                by {r.by}, {ago(r.at)}
              </span>
            </Text>
          ))}
        </Stack>
      </Grid>
    </Stack>
  )
}
