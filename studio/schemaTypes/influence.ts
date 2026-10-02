import {LinkIcon} from '@sanity/icons/Link'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {EvidencePickerInput} from '../components/inputs/EvidencePickerInput'
import {RelationPickerInput} from '../components/inputs/RelationPickerInput'
import {ORIGINS, RELATIONS} from './shared'

type Ref = {_ref?: string}

// A lineage link is two kinds of claim kept apart on purpose:
//  - the FACT (`citation`): how and where the later paper cites the earlier one, mined from its
//    full text. Read-only and always publishable.
//  - the INTERPRETATION (`relation`, `inherited`, `explanation`): a judgement. Public queries
//    project it only when `provenance.reviewDecision == "accepted"`.
export const influence = defineType({
  name: 'influence',
  title: 'Lineage link',
  type: 'document',
  icon: LinkIcon,
  groups: [
    {name: 'fact', title: 'Fact', default: true},
    {name: 'interpretation', title: 'Interpretation'},
    {name: 'provenance', title: 'Review'},
  ],
  fields: [
    defineField({
      name: 'from',
      title: 'Earlier paper',
      type: 'reference',
      to: [{type: 'paper'}],
      group: 'fact',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'to',
      title: 'Later paper',
      type: 'reference',
      to: [{type: 'paper'}],
      group: 'fact',
      validation: (rule) =>
        rule.required().custom(async (to: Ref | undefined, context) => {
          const from = (context.document?.from as Ref | undefined)?._ref
          if (!to?._ref || !from) return true
          if (to._ref === from) return 'A paper cannot be its own ancestor'
          const dates = await context
            .getClient({apiVersion: '2025-02-19'})
            .fetch<{from?: string; to?: string}>(`{"from": *[_id == $from][0].publishedAt, "to": *[_id == $to][0].publishedAt}`, {from, to: to._ref})
          if (dates.from && dates.to && dates.from > dates.to) return 'The earlier paper was published after the later one'
          const id = context.document?._id.replace(/^drafts\./, '')
          const duplicate = await context
            .getClient({apiVersion: '2025-02-19'})
            .fetch<number>(`count(*[_type == "influence" && from._ref == $from && to._ref == $to && !(_id in [$id, "drafts." + $id])])`, {from, to: to._ref, id})
          return duplicate ? 'A link between these two papers already exists' : true
        }),
    }),
    defineField({
      name: 'citation',
      title: 'Citation facts',
      description: 'Mined from the later paper’s full text. Read-only.',
      type: 'object',
      group: 'fact',
      readOnly: true,
      fields: [
        defineField({name: 'mentions', title: 'Times cited', type: 'number'}),
        defineField({name: 'methodMentions', title: 'Cited in Method-like sections', type: 'number'}),
        defineField({name: 'relatedMentions', title: 'Cited in Related Work', type: 'number'}),
        defineField({name: 'sections', type: 'array', of: [defineArrayMember({type: 'string'})]}),
        defineField({
          name: 'contexts',
          title: 'Citation sentences',
          type: 'array',
          of: [
            defineArrayMember({
              type: 'object',
              name: 'citationContext',
              fields: [
                defineField({name: 'section', type: 'string'}),
                defineField({name: 'text', type: 'text'}),
              ],
              preview: {select: {title: 'text', subtitle: 'section'}},
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: 'evidenceKey',
      title: 'Evidence sentence',
      description: 'The _key of the citation sentence that best supports the relation.',
      type: 'string',
      group: 'interpretation',
      components: {input: EvidencePickerInput},
      validation: (rule) =>
        rule.custom((key: string | undefined, context) => {
          if (!key) return true
          const contexts = (context.document?.citation as {contexts?: {_key: string}[]} | undefined)?.contexts ?? []
          return contexts.some((c) => c._key === key) ? true : 'Pick one of the citation sentences above'
        }),
    }),
    defineField({
      name: 'relation',
      type: 'string',
      group: 'interpretation',
      options: {list: RELATIONS, layout: 'radio'},
      components: {input: RelationPickerInput},
    }),
    defineField({
      name: 'inherited',
      title: 'Concepts carried over',
      type: 'array',
      group: 'interpretation',
      of: [defineArrayMember({type: 'reference', to: [{type: 'concept'}], options: {filter: 'level == "concept"'}})],
      validation: (rule) => rule.unique().max(6),
    }),
    defineField({
      name: 'explanation',
      type: 'text',
      rows: 3,
      group: 'interpretation',
      validation: (rule) =>
        rule.max(280).custom((value, context) => {
          const decision = (context.document?.provenance as {reviewDecision?: string} | undefined)?.reviewDecision
          const relation = context.document?.relation
          if (decision === 'accepted' && !relation) return 'An accepted link needs a relation'
          return true
        }),
    }),
    defineField({
      name: 'provenance',
      type: 'object',
      group: 'provenance',
      fields: [
        defineField({name: 'origin', type: 'string', options: {list: ORIGINS}, readOnly: true}),
        defineField({
          name: 'suggestedRelation',
          title: 'Suggested relation',
          description: 'What the harvest or AI proposed, kept for comparison after review.',
          type: 'string',
          options: {list: RELATIONS},
          readOnly: true,
        }),
        defineField({name: 'confidence', type: 'number', readOnly: true, validation: (rule) => rule.min(0).max(1)}),
        defineField({
          name: 'reviewDecision',
          title: 'Review',
          type: 'string',
          options: {list: ['proposed', 'accepted', 'rejected'], layout: 'radio', direction: 'horizontal'},
          initialValue: 'proposed',
          validation: (rule) => rule.required(),
        }),
        defineField({name: 'reviewedBy', type: 'string'}),
        defineField({name: 'reviewedAt', type: 'datetime'}),
      ],
    }),
  ],
  orderings: [{title: 'Most cited', name: 'mentionsDesc', by: [{field: 'citation.mentions', direction: 'desc'}]}],
  preview: {
    select: {
      from: 'from.shortName',
      to: 'to.shortName',
      relation: 'relation',
      decision: 'provenance.reviewDecision',
      mentions: 'citation.mentions',
    },
    prepare: ({from, to, relation, decision, mentions}) => ({
      title: `${from ?? '?'} → ${to ?? '?'}`,
      subtitle: [
        decision === 'accepted' ? RELATIONS.find((r) => r.value === relation)?.title : decision === 'rejected' ? 'Rejected' : 'Unreviewed',
        mentions ? `cited ${mentions}×` : null,
      ]
        .filter(Boolean)
        .join(' · '),
    }),
  },
})
