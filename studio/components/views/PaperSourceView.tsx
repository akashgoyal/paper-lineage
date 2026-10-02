import {Box, Flex, Spinner, Stack, Text} from '@sanity/ui'
import type {UserViewComponent} from 'sanity/structure'
import {publishedId, useViewData} from './useViewData'

type Source = {source?: string; sections?: {_key: string; heading?: string; text?: string}[]} | null

// Paper → Source tab: the parsed full text (private paperText.* document), section by section.
export const PaperSourceView: UserViewComponent = ({documentId}) => {
  const {data, error} = useViewData<Source>(`*[_type == "paperText" && paper._ref == $id][0]{source, sections}`, {
    id: publishedId(documentId),
  })
  if (error) return <Box padding={4}><Text>Could not load full text: {error.message}</Text></Box>
  if (data === undefined) return <Flex padding={5} justify="center"><Spinner /></Flex>
  if (!data?.sections?.length) return <Box padding={4}><Text muted>No full text was captured for this paper.</Text></Box>
  return (
    <Box padding={4} style={{maxWidth: 760}}>
      <Stack gap={5}>
        <Text size={1} muted>
          Read from the paper’s {data.source === 'pdf' ? 'PDF (pdftotext)' : 'HTML render (ar5iv / arXiv)'} · {data.sections.length} sections
        </Text>
        {data.sections.map((section) => (
          <Stack key={section._key} gap={3}>
            <Text size={2} weight="semibold">
              {section.heading || 'Untitled section'}
            </Text>
            {(section.text ?? '').split('\n\n').map((paragraph, i) => (
              <Text key={i} size={1} style={{fontFamily: 'Georgia, serif', lineHeight: 1.6}}>
                {paragraph}
              </Text>
            ))}
          </Stack>
        ))}
      </Stack>
    </Box>
  )
}
