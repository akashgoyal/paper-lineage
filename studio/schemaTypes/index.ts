import {concept} from './concept'
import {influence} from './influence'
import {paper} from './paper'
import {paperText} from './paperText'
import {gap, question} from './questions'
import {datasetStats, siteSettings} from './singletons'
import {storyline} from './storyline'

export const schemaTypes = [paper, influence, concept, storyline, paperText, question, gap, datasetStats, siteSettings]

export const SINGLETONS = ['datasetStats', 'siteSettings']
