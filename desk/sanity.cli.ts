import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  app: {
    organizationId: 'o2qzzix4g',
    entry: './src/App.tsx',
    title: 'Lineage Desk',
  },
  deployment: {
    appId: 'fhpnvzp9ueyizs9oh9kmwmsu',
  },
})
