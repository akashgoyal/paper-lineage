import {defineArrayMember, defineField} from 'sanity'

export const RELATIONS = [
  {value: 'extends', title: 'Extends', description: 'Builds directly on the earlier method and keeps its core idea.'},
  {value: 'combines', title: 'Reuses components', description: 'Plugs in a model, module or recipe from the earlier paper.'},
  {value: 'applies-to-new-domain', title: 'Applies to a new domain', description: 'Carries the idea to a different modality or task.'},
  {value: 'simplifies', title: 'Simplifies', description: 'Gets the same effect with fewer parts.'},
  {value: 'replaces', title: 'Replaces', description: 'Offers a substitute for the earlier approach.'},
  {value: 'challenges', title: 'Challenges', description: 'Argues against, or fixes a limitation of, the earlier work.'},
  {value: 'benchmarks-against', title: 'Benchmarks against', description: 'Uses the earlier work mainly as a baseline.'},
  {value: 'uses-dataset', title: 'Trained / evaluated on', description: 'The earlier paper is a dataset or benchmark this one uses.'},
]

export const ORIGINS = [
  {value: 'harvest', title: 'Harvest (mined from citation text)'},
  {value: 'ai', title: 'AI (Agent Action or build agent)'},
  {value: 'curator', title: 'Curator'},
]

export const PAPER_KINDS = [
  {value: 'method', title: 'Method'},
  {value: 'dataset', title: 'Dataset'},
  {value: 'benchmark', title: 'Benchmark'},
  {value: 'analysis', title: 'Analysis'},
]

export const CONCEPT_CATEGORIES = [
  {value: 'architecture', title: 'Architecture'},
  {value: 'objective', title: 'Objective'},
  {value: 'training-technique', title: 'Training technique'},
  {value: 'optimization', title: 'Optimization'},
  {value: 'data', title: 'Data'},
  {value: 'evaluation', title: 'Evaluation'},
]

export const originField = (initialValue: 'harvest' | 'ai' | 'curator' = 'curator') =>
  defineField({
    name: 'origin',
    title: 'Origin',
    type: 'string',
    options: {list: ORIGINS, layout: 'radio', direction: 'horizontal'},
    initialValue,
    validation: (rule) => rule.required(),
  })

// Portable Text with inline links to papers, concepts and lineage links, so stories stay linked data.
export const richText = (name: string, title: string) =>
  defineField({
    name,
    title,
    type: 'array',
    of: [
      defineArrayMember({
        type: 'block',
        styles: [{title: 'Normal', value: 'normal'}, {title: 'Quote', value: 'blockquote'}],
        lists: [],
        marks: {
          decorators: [{title: 'Strong', value: 'strong'}, {title: 'Emphasis', value: 'em'}],
          annotations: [
            {name: 'paperMention', title: 'Paper', type: 'object', fields: [{name: 'paper', type: 'reference', to: [{type: 'paper'}], validation: (rule) => rule.required()}]},
            {name: 'conceptMention', title: 'Concept', type: 'object', fields: [{name: 'concept', type: 'reference', to: [{type: 'concept'}], validation: (rule) => rule.required()}]},
            {name: 'linkMention', title: 'Lineage link', type: 'object', fields: [{name: 'influence', type: 'reference', to: [{type: 'influence'}], validation: (rule) => rule.required()}]},
          ],
        },
      }),
    ],
  })
