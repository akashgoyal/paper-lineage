import type {EvolutionNode} from './sanity/types'

export type ChainStep = {node: EvolutionNode; alsoDrawsOn: EvolutionNode[]}

/**
 * Flatten a concept's buildsOn tree into its main line of descent, oldest first (DESIGN_SPEC §6.5):
 * at each level follow the first earlier idea; the others are listed as "also draws on".
 */
export function mainChain(root: EvolutionNode, maxSteps = 6): ChainStep[] {
  const steps: ChainStep[] = []
  let node: EvolutionNode | undefined = root
  const seen = new Set<string>()
  while (node && steps.length < maxSteps && !seen.has(node._id)) {
    seen.add(node._id)
    const earlier: EvolutionNode[] = node.buildsOn ?? []
    steps.push({node, alsoDrawsOn: earlier.slice(1)})
    node = earlier[0]
  }
  return steps.reverse()
}

/** Paper ids of every introducing paper in the chain, for fetching the links between them. */
export const chainPaperIds = (steps: ChainStep[]) => [...new Set(steps.map((s) => s.node.by?._id).filter((id): id is string => !!id))]
