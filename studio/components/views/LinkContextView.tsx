import {Box, Card, Flex, Spinner, Stack, Text} from '@sanity/ui'
import type {UserViewComponent} from 'sanity/structure'
import {highlight} from '../inputs/EvidencePickerInput'
import {publishedId, useViewData} from './useViewData'

type Data = {
  from?: {shortName?: string; author?: string}
  to?: {shortName?: string}
  contexts?: {_key: string; section?: string; text?: string}[]
  evidenceKey?: string
  sections?: {heading?: string; text?: string}[]
}

const QUERY = `*[_id == $id][0]{
  "from": from->{shortName, "author": authors[0]},
  "to": to->{shortName},
  "contexts": citation.contexts,
  evidenceKey,
  "sections": *[_type == "paperText" && paper._ref == ^.to._ref][0].sections[]{heading, text}
}`

const squash = (s = '') => s.replace(/\s+/g, ' ').trim()

// Find the paragraph of the later paper that contains a citation sentence.
function paragraphFor(sentence: string, sections: Data['sections'] = []) {
  const probe = squash(sentence).slice(0, 60)
  for (const section of sections) {
    for (const paragraph of (section.text ?? '').split('\n\n')) {
      if (squash(paragraph).includes(probe)) return {heading: section.heading, paragraph: squash(paragraph)}
    }
  }
  return null
}

// Link → In context tab: each citation sentence inside its full paragraph, cited author marked.
export const LinkContextView: UserViewComponent = ({documentId}) => {
  const {data, error} = useViewData<Data>(QUERY, {id: publishedId(documentId)})
  if (error) return <Box padding={4}><Text>Could not load context: {error.message}</Text></Box>
  if (!data) return <Flex padding={5} justify="center"><Spinner /></Flex>
  const surname = data.from?.author?.split(' ').at(-1)
  if (!data.contexts?.length) return <Box padding={4}><Text muted>No citation sentences were captured for this link.</Text></Box>
  return (
    <Box padding={4} style={{maxWidth: 760}}>
      <Stack gap={4}>
        <Text size={1} muted>
          How {data.to?.shortName} cites {data.from?.shortName}: {data.contexts.length} sentence{data.contexts.length > 1 ? 's' : ''}
        </Text>
        {data.contexts.map((context) => {
          const found = paragraphFor(context.text ?? '', data.sections)
          const sentence = squash(context.text)
          const body = found?.paragraph ?? sentence
          const at = body.indexOf(sentence.slice(0, 60))
          return (
            <Card key={context._key} padding={4} radius={2} border tone={context._key === data.evidenceKey ? 'primary' : 'default'}>
              <Stack gap={3}>
                <Text size={0} muted weight="semibold" style={{textTransform: 'uppercase', letterSpacing: '0.06em'}}>
                  {found?.heading ?? context.section ?? 'Unknown section'}
                  {context._key === data.evidenceKey ? ' · chosen as evidence' : ''}
                </Text>
                <Text size={1} style={{fontFamily: 'Georgia, serif', lineHeight: 1.6}}>
                  {at >= 0 && found ? (
                    <>
                      <span style={{opacity: 0.65}}>{body.slice(0, at)}</span>
                      <b>{highlight(body.slice(at, at + sentence.length), surname)}</b>
                      <span style={{opacity: 0.65}}>{body.slice(at + sentence.length)}</span>
                    </>
                  ) : (
                    highlight(sentence, surname)
                  )}
                </Text>
              </Stack>
            </Card>
          )
        })}
      </Stack>
    </Box>
  )
}
