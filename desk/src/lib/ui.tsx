import {Badge, Box, Button, Card, Flex, Spinner, Stack, Text, useToast} from '@sanity/ui'
import {Component, type ReactNode, Suspense} from 'react'

export function Loading({label = 'Loading…'}: {label?: string}) {
  return (
    <Flex align="center" justify="center" padding={5} gap={3}>
      <Spinner muted />
      <Text muted size={1}>
        {label}
      </Text>
    </Flex>
  )
}

/** Each fetching component gets its own boundary, so one slow query never blanks the whole Desk. */
export function Boundary({children, label}: {children: ReactNode; label?: string}) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<Loading label={label} />}>{children}</Suspense>
    </ErrorBoundary>
  )
}

class ErrorBoundary extends Component<{children: ReactNode}, {error: Error | null}> {
  state = {error: null as Error | null}
  static getDerivedStateFromError(error: Error) {
    return {error}
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <Card padding={4} tone="critical" radius={2} margin={3}>
        <Stack space={3}>
          <Text weight="semibold">This panel failed to load.</Text>
          <Text size={1} muted>
            {this.state.error.message}
          </Text>
          <Button text="Try again" mode="ghost" onClick={() => this.setState({error: null})} />
        </Stack>
      </Card>
    )
  }
}

export function Empty({title, children}: {title: string; children?: ReactNode}) {
  return (
    <Box padding={5}>
      <Stack space={3}>
        <Text weight="semibold">{title}</Text>
        {children && (
          <Text muted size={1}>
            {children}
          </Text>
        )}
      </Stack>
    </Box>
  )
}

export function Overline({children}: {children: ReactNode}) {
  return (
    <Text size={0} muted weight="semibold" style={{textTransform: 'uppercase', letterSpacing: '0.06em'}}>
      {children}
    </Text>
  )
}

export function DecisionBadge({decision}: {decision?: string | null}) {
  if (decision === 'accepted') return <Badge tone="positive">Verified</Badge>
  if (decision === 'rejected') return <Badge tone="critical">Rejected</Badge>
  return <Badge tone="caution">Unreviewed</Badge>
}

/** Writes happen immediately; the toast offers the inverse (DESIGN_SPEC §10.2: no save buttons, Undo instead). */
export function useUndoToast() {
  const toast = useToast()
  return (title: string, undo?: () => void | Promise<unknown>) =>
    toast.push({
      status: 'success',
      title,
      duration: 6000,
      closable: true,
      description: undo ? <Button mode="bleed" padding={2} fontSize={1} text="Undo" onClick={() => void undo()} /> : undefined,
    })
}

export function useErrorToast() {
  const toast = useToast()
  return (title: string, error: unknown) =>
    toast.push({status: 'error', title, description: error instanceof Error ? error.message : String(error), closable: true})
}
