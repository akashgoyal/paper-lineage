import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'jd22zcim',
    dataset: 'production'
  },
  // Hosted at https://paper-lineage.sanity.studio (curators and Viewer-invited judges only).
  studioHost: 'paper-lineage',
  deployment: {
    appId: 'tbmmp04l3kc0twmw2tknd5wt',
    /**
     * Enable auto-updates for studios.
     * Learn more at https://www.sanity.io/docs/studio/latest-version-of-sanity#k47faf43faf56
     */
    autoUpdates: true,
  },
})
