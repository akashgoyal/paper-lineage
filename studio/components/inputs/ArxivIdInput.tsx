import {LaunchIcon} from '@sanity/icons/Launch'
import {Flex, Text, TextInput} from '@sanity/ui'
import {useCallback, useState, type ChangeEvent, type ClipboardEvent} from 'react'
import {set, unset, type StringInputProps} from 'sanity'

const ARXIV_ID = /^\d{4}\.\d{4,5}$/

// "https://arxiv.org/pdf/2301.12597v3", "arXiv:2301.12597", "2301.12597v1" → "2301.12597"
export function normalizeArxivId(raw: string): string {
  const match = raw.trim().match(/(\d{4}\.\d{4,5})(?:v\d+)?/)
  return match ? match[1] : raw.trim()
}

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
