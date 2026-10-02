import {Card, Flex, Radio, Stack, Text} from '@sanity/ui'
import {useEffect, useState, type ReactNode} from 'react'
import {set, useClient, useFormValue, type StringInputProps} from 'sanity'
import {API_VERSION} from '../../schemaTypes/shared'

type Context = {_key: string; section?: string; text?: string}

// Marks the cited paper's first-author surname inside a citation sentence.
export function highlight(text: string, needle?: string): ReactNode {
  if (!needle) return text
  const parts = text.split(new RegExp(`(${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g'))
  return parts.map((part, i) =>
    part === needle ? (
      <mark key={i} style={{background: '#FFE9A8', color: 'inherit', padding: '0 2px', borderRadius: 2}}>
        {part}
      </mark>
    ) : (
      part
    ),
  )
}

export function useCitedSurname(): string | undefined {
  const client = useClient({apiVersion: API_VERSION})
  const from = useFormValue(['from', '_ref']) as string | undefined
  const [surname, setSurname] = useState<string>()
  useEffect(() => {
    if (!from) return
    client
      .fetch<string | null>(`*[_id == $id][0].authors[0]`, {id: from})
      .then((author) => setSurname(author?.split(' ').at(-1)))
      .catch(() => setSurname(undefined))
  }, [client, from])
  return surname
}

// Lists every citation sentence as a radio card; picking one stores its _key as the evidence.
export function EvidencePickerInput(props: StringInputProps) {
  const {value, onChange, readOnly} = props
  const contexts = (useFormValue(['citation', 'contexts']) as Context[] | undefined) ?? []
  const surname = useCitedSurname()

  if (!contexts.length) {
    return (
      <Card padding={3} radius={2} tone="transparent" border>
        <Text size={1} muted>
          No citation sentences were captured for this link.
        </Text>
      </Card>
    )
  }

  return (
    <Stack gap={2} role="radiogroup">
      {contexts.map((context) => {
        const selected = value === context._key
        return (
          <Card
            key={context._key}
            as="label"
            padding={3}
            radius={2}
            border
            tone={selected ? 'primary' : 'default'}
            style={{cursor: readOnly ? 'default' : 'pointer', borderWidth: selected ? 2 : 1}}
          >
            <Flex gap={3} align="flex-start">
              <Radio
                checked={selected}
                disabled={readOnly}
                name="evidence"
                value={context._key}
                onChange={() => onChange(set(context._key))}
              />
              <Stack gap={2} flex={1}>
                <Text size={0} muted weight="semibold" style={{textTransform: 'uppercase', letterSpacing: '0.06em'}}>
                  {context.section || 'Unknown section'}
                </Text>
                <Text size={1} style={{fontFamily: 'Georgia, serif', lineHeight: 1.5}}>
                  {highlight(context.text ?? '', surname)}
                </Text>
              </Stack>
            </Flex>
          </Card>
        )
      })}
    </Stack>
  )
}
