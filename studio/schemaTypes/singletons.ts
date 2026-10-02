import {CogIcon, DashboardIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

// Kept current by the `refresh-stats` Function, so the site reads one small document
// instead of counting thousands on every page view.
export const datasetStats = defineType({
  name: 'datasetStats',
  title: 'Dataset stats',
  type: 'document',
  icon: DashboardIcon,
  readOnly: true,
  fields: [
    defineField({name: 'papers', type: 'number'}),
    defineField({name: 'links', type: 'number'}),
    defineField({name: 'linksAccepted', title: 'Links verified', type: 'number'}),
    defineField({name: 'linksRejected', type: 'number'}),
    defineField({name: 'concepts', type: 'number'}),
    defineField({name: 'themes', type: 'number'}),
    defineField({
      name: 'mostInfluential',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'ranked',
          fields: [
            defineField({name: 'paper', type: 'reference', to: [{type: 'paper'}], weak: true}),
            defineField({name: 'descendants', type: 'number'}),
          ],
          preview: {select: {title: 'paper.shortName', subtitle: 'descendants'}},
        }),
      ],
    }),
    defineField({name: 'updatedAt', type: 'datetime'}),
  ],
  preview: {prepare: () => ({title: 'Dataset stats'})},
})

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  icon: CogIcon,
  fields: [
    defineField({name: 'heroTitle', type: 'string', initialValue: 'Every idea has ancestors.'}),
    defineField({name: 'heroDek', type: 'text', rows: 2}),
    defineField({name: 'examplePrompts', title: 'Example questions on the Ask page', type: 'array', of: [defineArrayMember({type: 'string'})], validation: (rule) => rule.max(8)}),
    defineField({name: 'startPapers', title: '"Start from a paper" shortcuts', type: 'array', of: [defineArrayMember({type: 'reference', to: [{type: 'paper'}]})], validation: (rule) => rule.max(6).unique()}),
    defineField({name: 'featuredStoryline', type: 'reference', to: [{type: 'storyline'}]}),
  ],
  preview: {prepare: () => ({title: 'Site settings'})},
})
