import {type SanityConfig} from '@sanity/sdk'
import {SanityApp} from '@sanity/sdk-react'
import {Flex, Spinner} from '@sanity/ui'
import {Desk} from './Desk'
import {DATASET, PROJECT_ID} from './lib/model'
import {SanityUI} from './SanityUI'

const config: SanityConfig[] = [{projectId: PROJECT_ID, dataset: DATASET}]

function Loading() {
  return (
    <Flex justify="center" align="center" style={{width: '100vw', height: '100vh'}}>
      <Spinner />
    </Flex>
  )
}

export default function App() {
  return (
    <SanityUI>
      <SanityApp config={config} fallback={<Loading />}>
        <Desk />
      </SanityApp>
    </SanityUI>
  )
}
