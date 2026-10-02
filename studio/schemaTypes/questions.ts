import {CommentIcon, WarningOutlineIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

// Visitor questions are written server-side with ids `questions.<uuid>`: a private id path that
// public (unauthenticated) queries cannot read, even though Free-plan datasets are public.
export const question = defineType({
  name: 'question',
  title: 'Visitor question',
  type: 'document',
  icon: CommentIcon,
  readOnly: true,
  fields: [
    defineField({name: 'text', type: 'text', rows: 2}),
    defineField({name: 'askedAt', type: 'datetime'}),
    defineField({
      name: 'outcome',
      type: 'string',
      options: {list: ['answered', 'partial', 'unanswered']},
      description: '"partial" = the answer leaned on unreviewed links or found no path.',
    }),
    defineField({name: 'endpoints', title: 'Context endpoints used', type: 'array', of: [defineArrayMember({type: 'string'})], options: {list: ['groq', 'knowledge-base']}}),
    defineField({name: 'citedPapers', type: 'array', of: [defineArrayMember({type: 'reference', to: [{type: 'paper'}], weak: true})]}),
    defineField({name: 'citedLinks', type: 'array', of: [defineArrayMember({type: 'reference', to: [{type: 'influence'}], weak: true})]}),
    defineField({name: 'gap', type: 'reference', to: [{type: 'gap'}], weak: true}),
  ],
  orderings: [{title: 'Newest', name: 'askedDesc', by: [{field: 'askedAt', direction: 'desc'}]}],
  preview: {select: {title: 'text', subtitle: 'outcome'}},
})

export const gap = defineType({
  name: 'gap',
  title: 'Gap',
  type: 'document',
  icon: WarningOutlineIcon,
  fields: [
    defineField({
      name: 'kind',
      type: 'string',
      options: {
        list: [
          {value: 'missing-link', title: 'Possible missing link'},
          {value: 'missing-paper', title: 'Missing paper'},
          {value: 'unanswered', title: 'Unanswered question'},
          {value: 'weak-evidence', title: 'Weak evidence'},
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'title', type: 'string', validation: (rule) => rule.required()}),
    defineField({name: 'detail', type: 'text', rows: 4}),
    defineField({name: 'papers', title: 'Related papers', type: 'array', of: [defineArrayMember({type: 'reference', to: [{type: 'paper'}], weak: true})]}),
    defineField({name: 'suggestedArxivIds', title: 'Papers to add (arXiv IDs)', type: 'array', of: [defineArrayMember({type: 'string'})]}),
    defineField({name: 'questionCount', title: 'Questions that hit this gap', type: 'number', readOnly: true, initialValue: 0}),
    defineField({
      name: 'status',
      type: 'string',
      options: {list: ['open', 'in-progress', 'resolved', 'wont-fix'], layout: 'radio', direction: 'horizontal'},
      initialValue: 'open',
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'resolution', type: 'text', rows: 2, hidden: ({document}) => document?.status !== 'resolved'}),
  ],
  preview: {
    select: {title: 'title', kind: 'kind', status: 'status', count: 'questionCount'},
    prepare: ({title, kind, status, count}) => ({title, subtitle: [kind, status, count ? `${count} questions` : null].filter(Boolean).join(' · ')}),
  },
})
