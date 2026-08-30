/**
 * Calculates display-friendly statistics without changing the tree.
 */
function calculateTreeStats(tree) {
  if (tree === null || typeof tree !== 'object' || tree.root === undefined) {
    throw new TypeError('A B+ tree instance is required')
  }

  const levels = collectTreeLevels(tree.root)
  const nodes = levels.flat()
  const leafNodes = nodes.filter((node) => node.isLeaf)
  const internalNodes = nodes.filter((node) => !node.isLeaf)
  const recordCount = leafNodes.reduce(
    (total, leaf) => total + leaf.keys.length,
    0,
  )
  const separatorKeyCount = internalNodes.reduce(
    (total, node) => total + node.keys.length,
    0,
  )
  const totalKeyCount = recordCount + separatorKeyCount
  const maxKeySlots = nodes.length * (tree.order - 1)
  const maxLeafKeySlots = leafNodes.length * (tree.order - 1)
  const firstLeaf = leafNodes[0]
  const lastLeaf = leafNodes.at(-1)

  return {
    order: tree.order,
    height: levels.length,
    nodeCount: nodes.length,
    internalNodeCount: internalNodes.length,
    leafNodeCount: leafNodes.length,
    recordCount,
    separatorKeyCount,
    totalKeyCount,
    maxKeySlots,
    keySlotUtilization: percentage(totalKeyCount, maxKeySlots),
    leafUtilization: percentage(recordCount, maxLeafKeySlots),
    minKey: firstLeaf?.keys[0],
    maxKey: lastLeaf?.keys.at(-1),
  }
}

/**
 * Groups nodes by depth using breadth-first traversal.
 */
function collectTreeLevels(root) {
  if (root === null || typeof root !== 'object') {
    throw new TypeError('A root node is required')
  }

  const levels = []
  let currentLevel = [root]

  while (currentLevel.length > 0) {
    levels.push(currentLevel)
    const nextLevel = []

    for (const node of currentLevel) {
      if (!node.isLeaf) {
        nextLevel.push(...node.children)
      }
    }

    currentLevel = nextLevel
  }

  return levels
}

function percentage(value, capacity) {
  if (capacity === 0) {
    return 0
  }

  return Number(((value / capacity) * 100).toFixed(1))
}

export { calculateTreeStats, collectTreeLevels }
export default calculateTreeStats
