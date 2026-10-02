import {Box, Card, Flex, Spinner, Stack, Text} from '@sanity/ui'
import type {UserViewComponent} from 'sanity/structure'
import {RELATIONS, RELATION_COLORS, UNREVIEWED_COLOR} from '../../schemaTypes/shared'
import {publishedId, useViewData} from './useViewData'

type Row = {
  _id: string
  paper?: {shortName?: string; publishedAt?: string}
  relation?: string
  decision?: string
  mentions?: number
  method?: number
}
type Lineage = {paper?: {shortName?: string; publishedAt?: string}; builtOn: Row[]; ledTo: Row[]; grandparents: number}

const QUERY = `{
  "paper": *[_id == $id][0]{shortName, publishedAt},
  "builtOn": *[_type == "influence" && to._ref == $id]{
    _id, "paper": from->{shortName, publishedAt}, relation, "decision": provenance.reviewDecision,
    "mentions": citation.mentions, "method": citation.methodMentions
  } | order(method desc, mentions desc),
  "ledTo": *[_type == "influence" && from._ref == $id]{
    _id, "paper": to->{shortName, publishedAt}, relation, "decision": provenance.reviewDecision,
    "mentions": citation.mentions, "method": citation.methodMentions
  } | order(method desc, mentions desc),
  "grandparents": count(array::unique(*[_type == "influence" && to._ref in *[_type == "influence" && to._ref == $id].from._ref].from._ref))
}`

function Line({row}: {row: Row}) {
  const accepted = row.decision === 'accepted' && row.relation
  return (
    <Box
      style={{
        width: 28,
        height: 0,
        borderTop: accepted ? `2px solid ${RELATION_COLORS[row.relation!]}` : `2px dotted ${UNREVIEWED_COLOR}`,
        opacity: row.decision === 'rejected' ? 0.3 : 1,
      }}
    />
  )
}

function LinkRow({row, side}: {row: Row; side: 'left' | 'right'}) {
  const accepted = row.decision === 'accepted' && row.relation
  const label = accepted ? RELATIONS.find((r) => r.value === row.relation)?.title : row.decision === 'rejected' ? 'Rejected' : 'Cites · unreviewed'
  const name = (
    <Stack gap={1} flex={1}>
      <Text size={1} weight="semibold" align={side === 'left' ? 'right' : 'left'}>
        {row.paper?.shortName ?? '?'} <span style={{fontWeight: 400, opacity: 0.6}}>{row.paper?.publishedAt?.slice(0, 4)}</span>
      </Text>
      <Text size={0} muted align={side === 'left' ? 'right' : 'left'}>
        {label} · {row.mentions ?? 0}× · {row.method ?? 0} in Method
      </Text>
    </Stack>
  )
  return (
    <Flex align="center" gap={2}>
      {side === 'left' ? (
        <>
          {name}
          <Line row={row} />
        </>
      ) : (
        <>
          <Line row={row} />
          {name}
        </>
      )}
    </Flex>
  )
}

// Paper → Lineage tab: one generation each way, styled like the public graph (solid = verified).
export const PaperLineageView: UserViewComponent = ({documentId}) => {
  const {data, error} = useViewData<Lineage>(QUERY, {id: publishedId(documentId)})
  if (error) return <Box padding={4}><Text>Could not load lineage: {error.message}</Text></Box>
  if (!data) return <Flex padding={5} justify="center"><Spinner /></Flex>
  return (
    <Box padding={4}>
      <Box style={{display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 24, alignItems: 'start'}}>
        <Stack gap={3}>
          <Text size={1} muted weight="semibold">
            BUILT ON · {data.builtOn.length}
          </Text>
          {data.builtOn.map((row) => <LinkRow key={row._id} row={row} side="left" />)}
          {!data.builtOn.length && <Text size={1} muted>No earlier papers in this dataset.</Text>}
        </Stack>
        <Card padding={3} radius={2} tone="primary" style={{position: 'sticky', top: 16}}>
          <Stack gap={2}>
            <Text size={2} weight="semibold" align="center">
              {data.paper?.shortName}
            </Text>
            <Text size={1} muted align="center">
              {data.paper?.publishedAt?.slice(0, 4)} · {data.grandparents} papers two generations back
            </Text>
          </Stack>
        </Card>
        <Stack gap={3}>
          <Text size={1} muted weight="semibold">
            LED TO · {data.ledTo.length}
          </Text>
          {data.ledTo.map((row) => <LinkRow key={row._id} row={row} side="right" />)}
          {!data.ledTo.length && <Text size={1} muted>No later papers in this dataset yet.</Text>}
        </Stack>
      </Box>
    </Box>
  )
}
