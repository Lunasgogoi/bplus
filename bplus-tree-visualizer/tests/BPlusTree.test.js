import test from 'node:test'
import assert from 'node:assert/strict'

import BPlusTree from '../src/engine/BPlusTree.js'

function validateNode(node, order, parent = null) {
  assert.equal(node.parent, parent)
  assert.ok(node.keys.length <= order - 1)

  if (parent !== null) {
    const minimumKeys = node.isLeaf
      ? Math.ceil((order - 1) / 2)
      : Math.ceil(order / 2) - 1

    assert.ok(node.keys.length >= minimumKeys)
  }

  for (let index = 1; index < node.keys.length; index += 1) {
    assert.ok(node.keys[index - 1] < node.keys[index])
  }

  if (!node.isLeaf) {
    assert.equal(node.children.length, node.keys.length + 1)

    if (parent === null) {
      assert.ok(node.children.length >= 2)
    }

    const separatorKeys = node.children
      .slice(1)
      .map((child) => getMinimumKey(child))

    assert.deepEqual(node.keys, separatorKeys)

    for (const child of node.children) {
      validateNode(child, order, node)
    }
  }
}

function getMinimumKey(node) {
  let current = node

  while (!current.isLeaf) {
    current = current.children[0]
  }

  return current.keys[0]
}

function getLeaves(tree) {
  let leaf = tree.root

  while (!leaf.isLeaf) {
    leaf = leaf.children[0]
  }

  const leaves = []

  while (leaf !== null) {
    leaves.push(leaf)
    leaf = leaf.next
  }

  return leaves
}

test('inserts keys in sorted order without splitting', () => {
  const tree = new BPlusTree(4)

  tree.insert(20, 'twenty')
  tree.insert(10, 'ten')
  tree.insert(30, 'thirty')

  assert.deepEqual(tree.root.keys, [10, 20, 30])
  assert.deepEqual(tree.root.values, ['ten', 'twenty', 'thirty'])
  assert.equal(tree.size, 3)
})

test('splits a leaf and preserves its next pointer', () => {
  const tree = new BPlusTree(4)

  for (const key of [10, 20, 30, 40]) {
    tree.insert(key)
  }

  assert.equal(tree.root.isLeaf, false)
  assert.deepEqual(tree.root.keys, [30])
  assert.deepEqual(tree.root.children[0].keys, [10, 20])
  assert.deepEqual(tree.root.children[1].keys, [30, 40])
  assert.equal(tree.root.children[0].next, tree.root.children[1])
  assert.equal(tree.root.children[1].next, null)
})

test('splits internal nodes and keeps all tree invariants', () => {
  const tree = new BPlusTree(3)
  const keys = [15, 3, 18, 7, 20, 1, 9, 13, 5, 11, 17, 2, 4, 6, 8, 10, 12]

  for (const key of keys) {
    tree.insert(key, `value-${key}`)
  }

  validateNode(tree.root, tree.order)

  const leaves = getLeaves(tree)
  const leafKeys = leaves.flatMap((leaf) => leaf.keys)
  const leafValues = leaves.flatMap((leaf) => leaf.values)

  assert.deepEqual(leafKeys, [...keys].sort((left, right) => left - right))
  assert.deepEqual(
    leafValues,
    leafKeys.map((key) => `value-${key}`),
  )
  assert.equal(tree.size, keys.length)
})

test('updates the value when a key already exists', () => {
  const tree = new BPlusTree()

  assert.deepEqual(tree.insert(7, 'old'), { inserted: true, updated: false })
  assert.deepEqual(tree.insert(7, 'new'), { inserted: false, updated: true })
  assert.deepEqual(tree.root.keys, [7])
  assert.deepEqual(tree.root.values, ['new'])
  assert.equal(tree.size, 1)
})

test('supports string keys but rejects mixed and invalid keys', () => {
  const tree = new BPlusTree()

  tree.insert('beta')
  tree.insert('alpha')

  assert.deepEqual(tree.root.keys, ['alpha', 'beta'])
  assert.throws(() => tree.insert(3), /Cannot mix/)
  assert.throws(() => new BPlusTree().insert(Number.NaN), /finite numbers/)
})

test('finds exact keys across multiple levels', () => {
  const tree = new BPlusTree(3)

  for (let key = 1; key <= 20; key += 1) {
    tree.insert(key, `record-${key}`)
  }

  assert.equal(tree.search(1), 'record-1')
  assert.equal(tree.search(11), 'record-11')
  assert.equal(tree.search(20), 'record-20')
  assert.equal(tree.search(21), undefined)
})

test('records the node path and selected child for visualization', () => {
  const tree = new BPlusTree(3)

  for (let key = 1; key <= 12; key += 1) {
    tree.insert(key)
  }

  const result = tree.searchWithPath(8)

  assert.equal(result.found, true)
  assert.equal(result.value, 8)
  assert.ok(result.path.length > 1)
  assert.equal(result.path[0].node, tree.root)
  assert.equal(result.path.at(-1).node.isLeaf, true)
  assert.equal(result.path.at(-1).childIndex, null)

  for (let index = 0; index < result.path.length - 1; index += 1) {
    const step = result.path[index]
    assert.equal(
      step.node.children[step.childIndex],
      result.path[index + 1].node,
    )
  }
})

test('returns inclusive ordered ranges by walking linked leaves', () => {
  const tree = new BPlusTree(4)

  for (const key of [50, 10, 80, 20, 70, 30, 60, 40, 90]) {
    tree.insert(key, key * 10)
  }

  assert.deepEqual(tree.rangeSearch(25, 75), [
    { key: 30, value: 300 },
    { key: 40, value: 400 },
    { key: 50, value: 500 },
    { key: 60, value: 600 },
    { key: 70, value: 700 },
  ])
  assert.deepEqual(tree.rangeSearch(20, 20), [{ key: 20, value: 200 }])
  assert.deepEqual(tree.rangeSearch(91, 100), [])
})

test('records the descent path and leaves visited by a range scan', () => {
  const tree = new BPlusTree(4)

  for (let key = 10; key <= 90; key += 10) {
    tree.insert(key, key)
  }

  const result = tree.rangeSearchWithPath(25, 75)

  assert.deepEqual(
    result.records.map((record) => record.key),
    [30, 40, 50, 60, 70],
  )
  assert.equal(result.path[0].node, tree.root)
  assert.equal(result.path.at(-1).node.isLeaf, true)
  assert.ok(result.leaves.length > 1)

  for (let index = 0; index < result.leaves.length - 1; index += 1) {
    assert.equal(result.leaves[index].next, result.leaves[index + 1])
  }
})

test('validates search keys and range boundaries', () => {
  const tree = new BPlusTree()

  tree.insert('bravo', 2)
  tree.insert('alpha', 1)
  tree.insert('charlie', 3)

  assert.equal(tree.search('alpha'), 1)
  assert.equal(tree.search('missing'), undefined)
  assert.deepEqual(tree.rangeSearch('alpha', 'bravo'), [
    { key: 'alpha', value: 1 },
    { key: 'bravo', value: 2 },
  ])
  assert.throws(() => tree.search(1), /Cannot mix/)
  assert.throws(() => tree.rangeSearch('zulu', 'alpha'), /cannot be greater/)
  assert.throws(
    () => new BPlusTree().rangeSearch('alpha', 10),
    /same key type/,
  )
})

test('deletes from a root leaf and resets an empty tree', () => {
  const tree = new BPlusTree()

  tree.insert(5, 'five')
  tree.insert(10, 'ten')

  assert.deepEqual(tree.delete(5), { deleted: true, value: 'five' })
  assert.deepEqual(tree.delete(5), { deleted: false, value: undefined })
  assert.equal(tree.search(10), 'ten')

  assert.deepEqual(tree.delete(10), { deleted: true, value: 'ten' })
  assert.equal(tree.isEmpty, true)
  assert.equal(tree.root.isLeaf, true)
  assert.deepEqual(tree.root.keys, [])

  tree.insert('fresh-key', 'fresh-value')
  assert.equal(tree.search('fresh-key'), 'fresh-value')
})

test('borrows from a sibling and repairs separator keys', () => {
  const tree = new BPlusTree(4)

  for (const key of [1, 2, 3, 4, 5]) {
    tree.insert(key)
  }

  tree.delete(1)

  assert.deepEqual(tree.root.children[0].keys, [2, 3])
  assert.deepEqual(tree.root.children[1].keys, [4, 5])
  assert.deepEqual(tree.root.keys, [4])
  validateNode(tree.root, tree.order)
})

test('merges leaves and reduces the root height', () => {
  const tree = new BPlusTree(4)

  for (const key of [1, 2, 3, 4]) {
    tree.insert(key)
  }

  tree.delete(1)

  assert.equal(tree.root.isLeaf, true)
  assert.deepEqual(tree.root.keys, [2, 3, 4])
  assert.equal(tree.root.next, null)
  validateNode(tree.root, tree.order)
})

test('rebalances every supported order during complete teardown', () => {
  for (const order of [3, 4, 5]) {
    const tree = new BPlusTree(order)
    const keys = Array.from({ length: 60 }, (_, index) => index + 1)
    const insertionOrder = [...keys].sort(
      (left, right) => ((left * 37) % 61) - ((right * 37) % 61),
    )
    const deletionOrder = [
      ...keys.filter((key) => key % 2 === 0),
      ...keys.filter((key) => key % 2 !== 0).reverse(),
    ]
    const remaining = new Set(keys)

    for (const key of insertionOrder) {
      tree.insert(key, `value-${key}`)
    }

    for (const key of deletionOrder) {
      assert.deepEqual(tree.delete(key), {
        deleted: true,
        value: `value-${key}`,
      })
      remaining.delete(key)

      validateNode(tree.root, tree.order)
      assert.equal(tree.size, remaining.size)

      const leafKeys = getLeaves(tree).flatMap((leaf) => leaf.keys)
      assert.deepEqual(leafKeys, [...remaining].sort((left, right) => left - right))
    }

    assert.equal(tree.isEmpty, true)
    assert.equal(tree.root.isLeaf, true)
  }
})

test('records leaf splits and root creation as operation events', () => {
  const tree = new BPlusTree(4)

  for (const key of [1, 2, 3]) {
    tree.insert(key)
  }

  tree.insert(4)
  const eventTypes = tree.lastOperation.map((event) => event.type)

  assert.deepEqual(eventTypes, [
    'visit-leaf',
    'insert',
    'split-leaf',
    'new-root',
  ])
  assert.ok(tree.lastOperation.every((event) => event.nodes.length > 0))
  assert.ok(
    tree.lastOperation.every((event) => event.nodeSnapshots.length > 0),
  )
})

test('records borrowing, merging, and root collapse events', () => {
  const borrowingTree = new BPlusTree(4)

  for (const key of [1, 2, 3, 4, 5]) {
    borrowingTree.insert(key)
  }

  borrowingTree.delete(1)
  assert.ok(
    borrowingTree.lastOperation.some((event) => event.type === 'borrow-right'),
  )

  const mergingTree = new BPlusTree(4)

  for (const key of [1, 2, 3, 4]) {
    mergingTree.insert(key)
  }

  mergingTree.delete(1)
  const eventTypes = mergingTree.lastOperation.map((event) => event.type)

  assert.ok(eventTypes.includes('merge-leaf'))
  assert.ok(eventTypes.includes('collapse-root'))
})
