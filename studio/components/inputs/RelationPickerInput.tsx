import {Badge, Box, Card, Flex, Radio, Stack, Text} from '@sanity/ui'
import {set, unset, useFormValue, type StringInputProps} from 'sanity'
import {RELATIONS, RELATION_COLORS} from '../../schemaTypes/shared'

type Provenance = {origin?: string; suggestedRelation?: string; confidence?: number}

// Radio cards with the public palette, each relation's meaning, and the harvest/AI suggestion marked.
export function RelationPickerInput(props: StringInputProps) {
  const {value, onChange, readOnly} = props
  const provenance = useFormValue(['provenance']) as Provenance | undefined
  const suggested = provenance?.suggestedRelation

  return (
    <Stack gap={2} role="radiogroup">
      {RELATIONS.map((relation) => {
        const selected = value === relation.value
        return (
          <Card
            key={relation.value}
            as="label"
            padding={3}
            radius={2}
            border
            tone={selected ? 'primary' : 'default'}
            style={{cursor: readOnly ? 'default' : 'pointer'}}
          >
            <Flex align="center" gap={3}>
              <Radio
                checked={selected}
                disabled={readOnly}
                onChange={() => onChange(set(relation.value))}
                name="relation"
                value={relation.value}
              />
              <Box style={{width: 20, height: 3, borderRadius: 2, background: RELATION_COLORS[relation.value]}} />
              <Stack gap={2} flex={1}>
                <Flex align="center" gap={2}>
                  <Text size={1} weight="semibold">
                    {relation.title}
                  </Text>
                  {suggested === relation.value && (
                    <Badge tone="caution" fontSize={0}>
                      Suggested · {provenance?.origin ?? 'harvest'}
                      {typeof provenance?.confidence === 'number' ? ` · ${provenance.confidence}` : ''}
                    </Badge>
                  )}
                </Flex>
                <Text size={1} muted>
                  {relation.description}
                </Text>
              </Stack>
            </Flex>
          </Card>
        )
      })}
      {value && !readOnly && (
        <Text size={1}>
          <a href="#" onClick={(event) => (event.preventDefault(), onChange(unset()))}>
            Clear relation
          </a>
        </Text>
      )}
    </Stack>
  )
}
