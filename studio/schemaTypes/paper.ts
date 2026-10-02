import {DocumentTextIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {PAPER_KINDS, originField} from './shared'

const ARXIV_ID = /^\d{4}\.\d{4,5}$/

export const paper = defineType({
  name: 'paper',
  title: 'Paper',
  type: 'document',
  icon: DocumentTextIcon,
  groups: [
    {name: 'overview', title: 'Overview', default: true},
    {name: 'concepts', title: 'Concepts'},
    {name: 'provenance', title: 'Provenance'},
  ],
  fields: [
    defineField({name: 'title', type: 'string', group: 'overview', validation: (rule) => rule.required()}),
    defineField({
      name: 'shortName',
      title: 'Short name',
      description: 'Graph label, e.g. "BLIP-2" or "ALBEF".',
      type: 'string',
      group: 'overview',
      validation: (rule) => rule.required().max(40),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      group: 'overview',
      options: {source: 'shortName', maxLength: 60},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'kind',
      type: 'string',
      group: 'overview',
      options: {list: PAPER_KINDS, layout: 'radio', direction: 'horizontal'},
      initialValue: 'method',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'arxivId',
      title: 'arXiv ID',
      description: 'Without version, e.g. 2301.12597.',
      type: 'string',
      group: 'overview',
      validation: (rule) =>
        rule.required().custom(async (value, context) => {
          if (!value) return true
          if (!ARXIV_ID.test(value)) return 'Use the bare arXiv ID, like 2301.12597'
          const id = context.document?._id.replace(/^drafts\./, '')
          const taken = await context
            .getClient({apiVersion: '2025-02-19'})
            .fetch<number>(`count(*[_type == "paper" && arxivId == $value && !(_id in [$id, "drafts." + $id])])`, {value, id})
          return taken ? 'Another paper already has this arXiv ID' : true
        }),
    }),
    defineField({name: 'publishedAt', title: 'Published', type: 'date', group: 'overview', validation: (rule) => rule.required()}),
    defineField({name: 'authors', type: 'array', group: 'overview', of: [defineArrayMember({type: 'string'})]}),
    defineField({name: 'primaryCategory', title: 'arXiv category', type: 'string', group: 'overview'}),
    defineField({
      name: 'summary',
      description: 'One plain-English sentence for cards and answers.',
      type: 'text',
      rows: 2,
      group: 'overview',
      validation: (rule) => rule.max(280),
    }),
    defineField({name: 'abstract', type: 'text', rows: 8, group: 'overview'}),
    defineField({
      name: 'keyFigure',
      title: 'Key figure',
      type: 'image',
      group: 'overview',
      options: {hotspot: true},
      fields: [
        defineField({name: 'alt', title: 'Alt text', type: 'string', validation: (rule) => rule.required()}),
        defineField({name: 'caption', type: 'string'}),
      ],
    }),
    defineField({
      name: 'uses',
      title: 'Concepts used',
      description: 'What this paper relies on. Concepts it introduced are the ones whose "Introduced by" points here.',
      type: 'array',
      group: 'concepts',
      of: [defineArrayMember({type: 'reference', to: [{type: 'concept'}], options: {filter: 'level == "concept"'}})],
      validation: (rule) => rule.unique(),
    }),
    defineField({
      name: 'harvest',
      title: 'Harvest record',
      type: 'object',
      group: 'provenance',
      readOnly: true,
      options: {collapsible: true, collapsed: false},
      fields: [
        originField('harvest'),
        defineField({name: 'depth', title: 'Generations back from BLIP-2', type: 'number'}),
        defineField({name: 'fullTextSource', title: 'Full text read from', type: 'string', options: {list: ['html', 'pdf']}}),
        defineField({name: 'referenceCount', title: 'References parsed', type: 'number'}),
        defineField({name: 'harvestedAt', type: 'datetime'}),
      ],
    }),
  ],
  orderings: [
    {title: 'Newest first', name: 'publishedDesc', by: [{field: 'publishedAt', direction: 'desc'}]},
    {title: 'Oldest first', name: 'publishedAsc', by: [{field: 'publishedAt', direction: 'asc'}]},
  ],
  preview: {
    select: {title: 'shortName', fullTitle: 'title', date: 'publishedAt', kind: 'kind', media: 'keyFigure'},
    prepare: ({title, fullTitle, date, kind, media}) => ({
      title,
      subtitle: [date?.slice(0, 4), kind !== 'method' ? kind : null, fullTitle].filter(Boolean).join(' · '),
      media,
    }),
  },
})
