import {LaunchIcon} from '@sanity/icons/Launch'
import {Flex, Text, TextInput} from '@sanity/ui'
import {useCallback, useState, type ChangeEvent, type ClipboardEvent} from 'react'
import {set, unset, type StringInputProps} from 'sanity'

import {ARXIV_ID, normalizeArxivId} from '../../lib/text'

export function ArxivIdInput(props: StringInputProps) {
  const {value, onChange, elementProps} = props
  const [draft, setDraft] = useState<string | null>(null)

  const commit = useCallback(
    (raw: string) => {
      const next = normalizeArxivId(raw)
      setDraft(null)
      onChange(next ? set(next) : unset())
    },
    [onChange],
  )

  const shown = draft ?? value ?? ''
  const valid = ARXIV_ID.test(value ?? '')

  return (
    <Flex direction="column" gap={2}>
      <TextInput
        {...elementProps}
        value={shown}
        placeholder="Paste an arXiv URL or ID"
        onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft(event.currentTarget.value)}
        onBlur={(event) => {
          if (draft !== null) commit(draft)
          elementProps.onBlur(event)
        }}
        onPaste={(event: ClipboardEvent<HTMLInputElement>) => {
          event.preventDefault()
          commit(event.clipboardData.getData('text'))
        }}
      />
      {valid && (
        <Text size={1} muted>
          <a href={`https://arxiv.org/abs/${value}`} target="_blank" rel="noreferrer">
            Open on arXiv <LaunchIcon />
          </a>
        </Text>
      )}
    </Flex>
  )
}
