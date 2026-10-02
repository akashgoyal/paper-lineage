import {useQuery} from '@sanity/sdk-react'
import type {WorkflowInstance} from '@sanity/workflow-engine'
import {useWorkflowInstances, useWorkflowSession} from '@sanity/workflow-sdk'
import {Badge, Box, Button, Card, Flex, Stack, Text, TextInput} from '@sanity/ui'
import {useState} from 'react'
import {ago} from '../lib/model'
import {Boundary, Overline, useErrorToast, useUndoToast} from '../lib/ui'
import {paperIdFromGdr, usePaperIntakeEngine} from './engine'

type Engine = ReturnType<typeof usePaperIntakeEngine>
type Field = {name: string; value?: unknown}
type Effect = {name: string; outputs?: Record<string, unknown>; ranAt?: string; status?: string}

const STAGE_TONE: Record<string, 'default' | 'primary' | 'caution' | 'positive'> = {
  fetching: 'default',
  checks: 'default',
  curation: 'caution',
  publishing: 'primary',
  published: 'positive',
}
const field = (i: WorkflowInstance, name: string) => (i.fields as unknown as Field[]).find((f) => f.name === name)?.value
/** Latest link count from either check effect: the same rule the approve gate uses. */
function openLinks(i: WorkflowInstance) {
  const runs = ((i as unknown as {effectHistory?: Effect[]}).effectHistory ?? []).filter((e) => (e.name === 'check-links' || e.name === 'recheck-links') && e.outputs)
  const last = runs.sort((a, b) => String(a.outputs?.at).localeCompare(String(b.outputs?.at))).at(-1)
  return last?.outputs as {open: number; accepted: number; total: number; at: string} | undefined
}

/** paper-intake instances, live from the `workflows` dataset (Workflows SDK over the App SDK store). */
export function IntakePanel() {
  const engine = usePaperIntakeEngine()
  const {instances, loading, error, unreadable} = useWorkflowInstances({engine})
  if (loading) return <Text muted size={1}>Loading workflow instances…</Text>
  if (error)
    return (
      <Text size={1} style={{color: 'var(--card-critical-fg-color, #c00)'}}>
        Workflow instances could not be read: {String((error as {message?: string}).message ?? error)}
      </Text>
    )
  const list = [...(instances ?? [])].filter((i) => i.definition === 'paper-intake')
  return (
    <Stack space={3}>
      <Overline>
        Workflow · paper-intake · {list.length} in flight{unreadable.length ? ` · ${unreadable.length} unreadable` : ''}
      </Overline>
      {list.length === 0 && (
        <Text size={1} muted>
          No paper is in intake. “Add paper” in the Inbox starts one.
        </Text>
      )}
      {list.map((i) => (
        <Boundary key={i._id} label="">
          <InstanceCard engine={engine} instance={i} />
        </Boundary>
      ))}
    </Stack>
  )
}

function InstanceCard({engine, instance}: {engine: Engine; instance: WorkflowInstance}) {
  const session = useWorkflowSession({engine, instanceId: instance._id})
  const paperId = paperIdFromGdr((field(instance, 'subject') as {id?: string} | undefined)?.id)
  const {data: paper} = useQuery<{shortName?: string; title?: string} | null>({query: `*[_id == $id][0]{shortName, title}`, params: {id: paperId}})
  const undoToast = useUndoToast()
  const errorToast = useErrorToast()
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const stage = instance.currentStage
  const counts = openLinks(instance)
  const pending = ((instance as unknown as {pendingEffects?: unknown[]}).pendingEffects ?? []).length
  const decision = field(instance, 'decision') as string | undefined
  const revisionNote = field(instance, 'revisionNote') as string | undefined
  const actions = session.evaluation?.currentStage.activities.flatMap((a) => a.actions.map((x) => ({...x, activity: a.activity.name}))) ?? []
  const human = actions.filter((a) => !a.triggered)
  const failed = session.evaluation?.currentStage.activities.some((a) => a.status === 'failed')

  const fire = async (activity: string, action: string, params?: Record<string, unknown>) => {
    setBusy(action)
    try {
      await session.fireAction({activity, action, params})
      undoToast(`${action} → ${paper?.shortName ?? paperId}`)
      setNote('')
    } catch (err) {
      errorToast(`Could not ${action}`, err)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card padding={4} radius={3} border>
      <Stack space={4}>
        <Flex align="center" gap={3} wrap="wrap">
          <Text weight="semibold">{paper?.shortName ?? paper?.title ?? paperId}</Text>
          <Badge tone={STAGE_TONE[stage] ?? 'default'}>{stage}</Badge>
          {failed && <Badge tone="critical">failed step</Badge>}
          {pending > 0 && <Badge tone="primary">{pending} effect{pending > 1 ? 's' : ''} queued · waiting for runner</Badge>}
          <Box flex={1} />
          <Text size={0} muted>
            started {ago((instance as unknown as {startedAt?: string}).startedAt)}
          </Text>
        </Flex>
        {counts && (
          <Text size={1} muted>
            Links into this paper: {counts.open} unreviewed · {counts.accepted} accepted · {counts.total} total (checked {ago(counts.at)})
          </Text>
        )}
        {decision === 'sent-back' && revisionNote && stage !== 'curation' && (
          <Text size={1}>
            Sent back: “{revisionNote}”
          </Text>
        )}
        {!session.ready && <Text size={1} muted>Evaluating…</Text>}
        {session.ready && stage === 'curation' && (
          <Stack space={3}>
            <Flex gap={2} wrap="wrap" align="center">
              {human
                .filter((a) => a.action.name !== 'send-back')
                .map((a) => (
                  <Button
                    key={a.action.name}
                    tone={a.action.name === 'approve' ? 'positive' : 'default'}
                    mode={a.action.name === 'approve' ? 'default' : 'ghost'}
                    text={busy === a.action.name ? 'Working…' : (a.action.title ?? a.action.name)}
                    disabled={!a.allowed || !!busy}
                    title={a.allowed ? undefined : reason(a.disabledReason?.kind, counts?.open)}
                    onClick={() => fire(a.activity, a.action.name)}
                  />
                ))}
            </Flex>
            {human.some((a) => a.action.name === 'approve' && !a.allowed) && (
              <Text size={1} muted>
                Approve is disabled by the workflow: {reason('filter-failed', counts?.open)}
              </Text>
            )}
            <Flex gap={2}>
              <Box flex={1}>
                <TextInput value={note} placeholder="Send back with a note (what needs fixing)" onChange={(e) => setNote(e.currentTarget.value)} />
              </Box>
              <Button tone="critical" mode="ghost" text="Send back" disabled={!note.trim() || !!busy} onClick={() => fire('review', 'send-back', {note: note.trim()})} />
            </Flex>
          </Stack>
        )}
      </Stack>
    </Card>
  )
}

function reason(kind: string | undefined, open: number | undefined) {
  if (kind === 'filter-failed')
    return open ? `${open} lineage link${open > 1 ? 's are' : ' is'} still unreviewed. Review them, then Re-check links.` : 'Re-check links first.'
  if (kind === 'activity-not-active') return 'This step is already done.'
  return kind ?? 'Not allowed right now.'
}
