import test from 'node:test'
import assert from 'node:assert/strict'

import BPlusTree from '../src/engine/BPlusTree.js'
import calculateTreeLayout from '../src/utils/treeLayout.js'
import calculateTreeStats, {
  collectTreeLevels,
} from '../src/utils/treeStats.js'

function createPopulatedTree(order = 4, count = 24) {
  const tree = new BPlusTree(order)

  for (let key = 1; key <= count; key += 1) {
    tree.insert(key, `value-${key}`)
  }

  return tree
}

test('calculates statistics for an empty tree', () => {
  const tree = new BPlusTree(4)

  assert.deepEqual(calculateTreeStats(tree), {
    order: 4,
    height: 1,
    nodeCount: 1,
    internalNodeCount: 0,
    leafNodeCount: 1,
    recordCount: 0,
    separatorKeyCount: 0,
    totalKeyCount: 0,
    maxKeySlots: 3,
    keySlotUtilization: 0,
    leafUtilization: 0,
    minKey: undefined,
    maxKey: undefined,
  })
})

test('calculates statistics across a multi-level tree', () => {
  const tree = createPopulatedTree(4, 30)
  const stats = calculateTreeStats(tree)
  const levels = collectTreeLevels(tree.root)

  assert.equal(stats.height, levels.length)
  assert.equal(stats.nodeCount, levels.flat().length)
  assert.equal(stats.internalNodeCount + stats.leafNodeCount, stats.nodeCount)
  assert.equal(stats.recordCount, tree.size)
  assert.equal(stats.minKey, 1)
  assert.equal(stats.maxKey, 30)
  assert.ok(stats.keySlotUtilization > 0)
  assert.ok(stats.keySlotUtilization <= 100)
  assert.ok(stats.leafUtilization > 0)
  assert.ok(stats.leafUtilization <= 100)
})

test('lays out every node and edge inside the SVG canvas', () => {
  const tree = createPopulatedTree(3, 18)
  const stats = calculateTreeStats(tree)
  const layout = calculateTreeLayout(tree.root)

  assert.equal(layout.nodes.length, stats.nodeCount)
  assert.equal(layout.edges.length, stats.nodeCount - 1)
  assert.equal(layout.levels.length, stats.height)
  assert.equal(new Set(layout.nodes.map((node) => node.id)).size, stats.nodeCount)
  assert.equal(layout.viewBox, `0 0 ${layout.width} ${layout.height}`)

  for (const node of layout.nodes) {
    assert.ok(node.x >= 0)
    assert.ok(node.y >= 0)
    assert.ok(node.x + node.width <= layout.width)
    assert.ok(node.y + node.height <= layout.height)
  }

  for (const edge of layout.edges) {
    assert.ok(edge.y2 > edge.y1)
    assert.ok(layout.nodes.some((node) => node.id === edge.parentId))
    assert.ok(layout.nodes.some((node) => node.id === edge.childId))
  }
})

test('keeps nodes from overlapping within the same level', () => {
  const tree = createPopulatedTree(4, 40)
  const layout = calculateTreeLayout(tree.root)

  for (const level of layout.levels) {
    const sortedNodes = [...level].sort((left, right) => left.x - right.x)

    for (let index = 1; index < sortedNodes.length; index += 1) {
      const previous = sortedNodes[index - 1]
      const current = sortedNodes[index]
      assert.ok(previous.x + previous.width <= current.x)
    }
  }
})

test('supports custom dimensions and preserves key snapshots', () => {
  const tree = createPopulatedTree(4, 8)
  const layout = calculateTreeLayout(tree.root, {
    keyWidth: 50,
    nodeHeight: 60,
    margin: 20,
  })
  const rootLayout = layout.nodes[0]
  const originalSnapshot = [...rootLayout.keys]

  tree.insert(100)

  assert.equal(rootLayout.height, 60)
  assert.equal(layout.options.margin, 20)
  assert.deepEqual(rootLayout.keys, originalSnapshot)
  assert.throws(
    () => calculateTreeLayout(tree.root, { horizontalGap: 0 }),
    /valid size/,
  )
})
