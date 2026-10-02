import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {SINGLETONS, schemaTypes} from './schemaTypes'
import {AcceptLinkAction, RejectLinkAction} from './components/actions'
import {OriginBadge, ReviewBadge} from './components/badges'
import {defaultDocumentNode, structure} from './structure'

export default defineConfig({
  name: 'default',
  title: 'Paper Lineage',

  projectId: 'jd22zcim',
  dataset: 'production',

  plugins: [structureTool({structure, defaultDocumentNode}), visionTool()],

  schema: {
    types: schemaTypes,
    // Singletons are opened from the structure only; keep them out of "Create new".
    templates: (templates) => templates.filter(({schemaType}) => !SINGLETONS.includes(schemaType)),
  },

  document: {
    actions: (actions, {schemaType}) => {
      if (SINGLETONS.includes(schemaType)) {
        return actions.filter(({action}) => action && ['publish', 'discardChanges', 'restore'].includes(action))
      }
      // Curators review links with Accept / Reject first; the default actions stay available after them.
      if (schemaType === 'influence') return [AcceptLinkAction, RejectLinkAction, ...actions]
      return actions
    },
    badges: (badges, {schemaType}) => {
      if (schemaType === 'influence') return [ReviewBadge, OriginBadge, ...badges]
      if (schemaType === 'paper' || schemaType === 'concept' || schemaType === 'storyline') return [OriginBadge, ...badges]
      return badges
    },
  },
})
