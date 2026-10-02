import {TagIcon} from '@sanity/icons/Tag'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {API_VERSION, CONCEPT_CATEGORIES, originField} from './shared'

// Two levels: a theme ("Vision-language models on frozen LLMs") groups concepts ("Q-Former").
// Who *uses* a concept is derived from `paper.uses`; who introduced it lives only here.
export const concept = defineType({
  name: 'concept',
  title: 'Concept',
  type: 'document',
  icon: TagIcon,
  fields: [
    defineField({name: 'name', type: 'string', validation: (rule) => rule.required()}),
    defineField({name: 'slug', type: 'slug', options: {source: 'name', maxLength: 60}, validation: (rule) => rule.required()}),
    defineField({
      name: 'level',
      type: 'string',
      options: {list: [{value: 'theme', title: 'Theme'}, {value: 'concept', title: 'Concept'}], layout: 'radio', direction: 'horizontal'},
      initialValue: 'concept',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'broader',
      title: 'Theme',
      type: 'reference',
      to: [{type: 'concept'}],
      options: {filter: 'level == "theme"'},
      hidden: ({document}) => document?.level === 'theme',
      validation: (rule) =>
        rule.custom((value, context) =>
          context.document?.level === 'concept' && !value ? 'Every concept belongs to a theme' : true,
        ),
    }),
    defineField({name: 'category', type: 'string', options: {list: CONCEPT_CATEGORIES}, validation: (rule) => rule.required()}),
    defineField({name: 'summary', type: 'text', rows: 2, validation: (rule) => rule.required().max(240)}),
    defineField({
      name: 'aliases',
      description: 'Other names people use; matched when tagging papers and searching.',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      hidden: ({document}) => document?.level === 'theme',
    }),
    defineField({
      name: 'introducedBy',
      title: 'Introduced by',
      type: 'reference',
      to: [{type: 'paper'}],
      hidden: ({document}) => document?.level === 'theme',
    }),
    defineField({
      name: 'buildsOn',
      title: 'Builds on',
      description: 'Earlier ideas this one grew out of (curated). Drives the concept page’s “How this idea evolved”.',
      type: 'array',
      hidden: ({document}) => document?.level === 'theme',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{type: 'concept'}],
          options: {
            filter: ({document}) => ({
              filter: 'level == "concept" && !(_id in [$self, "drafts." + $self])',
              params: {self: document._id.replace(/^drafts\./, '')},
            }),
          },
        }),
      ],
      validation: (rule) =>
        rule.unique().custom(async (refs: {_ref: string}[] | undefined, context) => {
          const own = (context.document?.introducedBy as {_ref?: string} | undefined)?._ref
          if (!refs?.length || !own) return true
          const rows = await context.getClient({apiVersion: API_VERSION}).fetch<{name: string; year?: string}[]>(
            '*[_id in $ids]{name, "year": introducedBy->publishedAt}',
            {ids: refs.map((r) => r._ref)},
          )
          const mine = await context.getClient({apiVersion: API_VERSION}).fetch<string | null>('*[_id == $id][0].publishedAt', {id: own})
          const later = rows.filter((r) => r.year && mine && r.year > mine).map((r) => r.name)
          return later.length ? `Introduced after this concept: ${later.join(', ')}` : true
        }),
    }),
    originField('ai'),
  ],
  preview: {
    select: {title: 'name', level: 'level', theme: 'broader.name', by: 'introducedBy.shortName'},
    prepare: ({title, level, theme, by}) => ({
      title,
      subtitle: level === 'theme' ? 'Theme' : [theme, by ? `introduced by ${by}` : null].filter(Boolean).join(' · '),
    }),
  },
})
