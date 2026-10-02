import {defineWorkflow} from '@sanity/workflow-engine/define'

type FieldShape = {name: string; type: 'number' | 'string' | 'datetime' | 'boolean'}

// Effect outputs are a strict allowlist: the runner may only return these keys.
const LINK_COUNTS: FieldShape[] = [
  {name: 'open', type: 'number'},
  {name: 'accepted', type: 'number'},
  {name: 'total', type: 'number'},
  {name: 'at', type: 'datetime'},
]

/** Auto-run an effect when its stage opens, then settle the activity from the effect's outcome. */
// Network effects get a few attempts before the activity is marked failed (bounded, engine-run retry).
const RETRY = {attempts: 3, backoff: {kind: 'exponential' as const, delayMs: 2000}}

const automatic = (activity: string, title: string, effect: string, outputs: FieldShape[]) => ({
  name: activity,
  title,
  actions: [
    {name: 'run', title: `Run ${effect}`, when: 'true', effects: [{name: effect, bindings: {paperId: '$fields.subject._id'}, outputs, retry: RETRY}]},
    {name: 'succeeded', when: `$effectStatus['${effect}'] == 'done'`, status: 'done' as const},
    {name: 'failed', when: `$effectStatus['${effect}'] == 'failed'`, status: 'failed' as const},
  ],
})

// Effect names are unique per definition, so the curator's re-check is its own effect. Both
// output {open, at}; the gate reads whichever ran last.
const OPEN_LINKS = `select(
  defined($effects['recheck-links'].at) && $effects['recheck-links'].at > $effects['check-links'].at => $effects['recheck-links'].open,
  $effects['check-links'].open
)`

/**
 * paper-intake (SPEC §7): a paper enters the lineage. Its metadata is fetched, its citation links are
 * counted, a curator reviews the links in the Lineage Desk and then approves or sends it back, and
 * approval publishes the paper. "Approve" stays disabled while any link into the paper is unreviewed —
 * the engine says why, and the Desk shows that reason.
 */
export const paperIntake = defineWorkflow({
  name: 'paper-intake',
  title: 'Paper intake',
  description: 'Fetch metadata, check lineage links, curator approval, publish.',
  initialStage: 'fetching',
  fields: [
    {name: 'subject', title: 'Paper', type: 'subject', types: ['paper'], required: true, initialValue: {type: 'input'}},
    {name: 'decision', title: 'Decision', type: 'string', options: {list: [{title: 'Approved', value: 'approved'}, {title: 'Sent back', value: 'sent-back'}]}},
    {name: 'revisionNote', title: 'Revision note', type: 'text'},
    {name: 'curatedBy', title: 'Curated by', type: 'actor'},
  ],
  stages: [
    {
      name: 'fetching',
      title: 'Fetching metadata',
      activities: [automatic('fetch', 'Fetch arXiv metadata', 'fetch-arxiv', [
          {name: 'title', type: 'string'},
          {name: 'updated', type: 'boolean'},
        ])],
      transitions: [{name: 'fetched', to: 'checks'}],
    },
    {
      name: 'checks',
      title: 'Checking links',
      activities: [automatic('check', 'Count unreviewed lineage links', 'check-links', LINK_COUNTS)],
      transitions: [{name: 'checked', to: 'curation'}],
    },
    {
      name: 'curation',
      title: 'Curation',
      activities: [
        {
          name: 'review',
          title: 'Review lineage links',
          actions: [
            {
              name: 'approve',
              title: 'Approve & publish',
              semantics: ['decision.accept'],
              filter: OPEN_LINKS + ' == 0',
              ops: [
                {type: 'field.set', target: {field: 'decision'}, value: {type: 'literal', value: 'approved'}},
                {type: 'field.set', target: {field: 'curatedBy'}, value: {type: 'actor'}},
                {type: 'field.unset', target: {field: 'revisionNote'}},
              ],
              status: 'done',
            },
            {
              name: 'send-back',
              title: 'Send back',
              semantics: ['decision.decline'],
              params: [{name: 'note', title: 'What needs fixing', type: 'string', required: true}],
              ops: [
                {type: 'field.set', target: {field: 'decision'}, value: {type: 'literal', value: 'sent-back'}},
                {type: 'field.set', target: {field: 'revisionNote'}, value: {type: 'param', param: 'note'}},
                {type: 'field.set', target: {field: 'curatedBy'}, value: {type: 'actor'}},
              ],
              status: 'done',
            },
            {
              name: 'recheck',
              title: 'Re-check links',
              description: 'Recount unreviewed links after reviewing them in the Desk.',
              effects: [{name: 'recheck-links', bindings: {paperId: '$fields.subject._id'}, outputs: LINK_COUNTS}],
            },
          ],
        },
      ],
      transitions: [
        {name: 'approved', to: 'publishing', when: `$allActivitiesDone && $fields.decision == "approved"`},
        {name: 'sent-back', to: 'fetching', when: `$allActivitiesDone && $fields.decision == "sent-back"`},
      ],
    },
    {
      name: 'publishing',
      title: 'Publishing',
      activities: [automatic('publish', 'Publish the paper', 'publish-bundle', [
          {name: 'published', type: 'boolean'},
          {name: 'at', type: 'datetime'},
        ])],
      transitions: [{name: 'published', to: 'published'}],
    },
    {name: 'published', title: 'Published'},
  ],
})
