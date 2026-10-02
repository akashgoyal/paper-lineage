import {Box, Card, Flex, Spinner, Stack, Text} from '@sanity/ui'
import type {UserViewComponent} from 'sanity/structure'
import {RELATIONS, RELATION_COLORS, UNREVIEWED_COLOR} from '../../schemaTypes/shared'
import {publishedId, useViewData} from './useViewData'

type Node = {
  _id: string
  name?: string
  by?: {_id: string; shortName?: string; year?: string}
  buildsOn?: Node[]
}
type Link = {from: string; to: string; relation?: string; decision?: string; mentions?: number}

// Follow buildsOn up to 6 levels (DESIGN_SPEC §6.5). GROQ can't recurse, so the projection is nested.
const level = (depth: number): string =>
  depth === 0
    ? `_id, name, "by": introducedBy->{_id, shortName, "year": string::split(publishedAt, "-")[0]}`
    : `_id, name, "by": introducedBy->{_id, shortName, "year": string::split(publishedAt, "-")[0]}, "buildsOn": buildsOn[]->{${level(depth - 1)}}`
const QUERY = `{
  "root": *[_id == $id][0]{${level(6)}},
  "links": *[_type == "influence"]{"from": from._ref, "to": to._ref, relation, "decision": provenance.reviewDecision, "mentions": citation.mentions}
}`

function Connector({link}: {link?: Link}) {
  const accepted = link?.decision === 'accepted' && link.relation
  const text = !link
    ? 'no direct link in this dataset'
    : accepted
      ? RELATIONS.find((r) => r.value === link.relation)?.title
      : `cites ${link.mentions ?? 0}× · not yet reviewed`
  return (
    <Flex align="center" gap={2} paddingY={2} paddingLeft={3}>
      <Box
        style={{
          width: 0,
          height: 22,
          borderLeft: !link ? '2px dashed #CFCAC0' : accepted ? `2px solid ${RELATION_COLORS[link.relation!]}` : `2px dotted ${UNREVIEWED_COLOR}`,
        }}
      />
      <Text size={0} muted>
        {text}
      </Text>
    </Flex>
  )
}

function Step({node, links, child}: {node: Node; links: Link[]; child?: Node}) {
  const link = child?.by && node.by ? links.find((l) => l.from === node.by!._id && l.to === child.by!._id) : undefined
  return (
    <Stack>
      {node.buildsOn?.map((earlier) => <Step key={earlier._id} node={earlier} links={links} child={node} />)}
      <Card padding={3} radius={2} border tone={child ? 'default' : 'primary'}>
        <Stack gap={2}>
          <Text size={1} weight="semibold">
            {node.name}
          </Text>
          <Text size={1} muted>
            {node.by ? `${node.by.shortName} · ${node.by.year}` : 'No introducing paper recorded'}
          </Text>
        </Stack>
      </Card>
      {child && <Connector link={link} />}
    </Stack>
  )
}

// Concept → Evolution tab: the curated buildsOn chain, oldest idea first.
export const ConceptEvolutionView: UserViewComponent = ({documentId}) => {
  const {data, error} = useViewData<{root?: Node; links: Link[]}>(QUERY, {id: publishedId(documentId)})
  if (error) return <Box padding={4}><Text>Could not load evolution: {error.message}</Text></Box>
  if (!data) return <Flex padding={5} justify="center"><Spinner /></Flex>
  if (!data.root?.buildsOn?.length) {
    return (
      <Box padding={4}>
        <Text muted>No earlier ideas recorded for this concept yet. Add them under “Builds on”.</Text>
      </Box>
    )
  }
  return (
    <Box padding={4} style={{maxWidth: 560}}>
      <Step node={data.root} links={data.links} />
    </Box>
  )
}
