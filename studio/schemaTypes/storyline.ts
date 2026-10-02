import {BookIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {originField, richText} from './shared'

export const storyline = defineType({
  name: 'storyline',
  title: 'Storyline',
  type: 'document',
  icon: BookIcon,
  fields: [
    defineField({name: 'title', type: 'string', validation: (rule) => rule.required()}),
    defineField({name: 'slug', type: 'slug', options: {source: 'title', maxLength: 60}, validation: (rule) => rule.required()}),
    defineField({name: 'dek', title: 'Standfirst', type: 'string', validation: (rule) => rule.max(160)}),
    richText('intro', 'Introduction'),
    defineField({
      name: 'steps',
      description: 'Ordered lineage links. Only accepted links can be used.',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'step',
          fields: [
            defineField({
              name: 'influence',
              type: 'reference',
              to: [{type: 'influence'}],
              options: {filter: 'provenance.reviewDecision == "accepted"'},
              validation: (rule) => rule.required(),
            }),
            richText('narrative', 'Narrative'),
          ],
          preview: {
            select: {from: 'influence.from.shortName', to: 'influence.to.shortName'},
            prepare: ({from, to}) => ({title: `${from ?? '?'} → ${to ?? '?'}`}),
          },
        }),
      ],
      validation: (rule) => rule.min(1),
    }),
    defineField({name: 'featured', type: 'boolean', initialValue: false}),
    originField('curator'),
  ],
})
