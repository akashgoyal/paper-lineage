import {BookIcon} from '@sanity/icons/Book'
import {defineArrayMember, defineField, defineType} from 'sanity'

// The parsed full text of a paper, kept out of `paper` so public queries and the GROQ-mode agent
// never pull it by accident. Seeded with ids like `paperText.2301-12597`: ids with a dot sit on a
// private path that unauthenticated (public CDN) queries cannot read.
export const paperText = defineType({
  name: 'paperText',
  title: 'Paper full text',
  type: 'document',
  icon: BookIcon,
  readOnly: true,
  fields: [
    defineField({name: 'paper', type: 'reference', to: [{type: 'paper'}], validation: (rule) => rule.required()}),
    defineField({name: 'source', title: 'Read from', type: 'string', options: {list: ['html', 'pdf']}}),
    defineField({
      name: 'sections',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'section',
          fields: [
            defineField({name: 'heading', type: 'string'}),
            defineField({name: 'text', type: 'text'}),
          ],
          preview: {select: {title: 'heading', subtitle: 'text'}},
        }),
      ],
    }),
  ],
  preview: {
    select: {title: 'paper.shortName', source: 'source'},
    prepare: ({title, source}) => ({title: `${title ?? 'Paper'} · full text`, subtitle: source}),
  },
})
