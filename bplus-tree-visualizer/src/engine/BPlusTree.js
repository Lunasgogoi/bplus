import LeafNode from './LeafNode.js'
import InternalNode from './InternalNode.js'

/**
 * Owns the B+ tree configuration and its root node.
 *
 * A new tree starts with one empty leaf as its root.
 */
class BPlusTree {
  constructor(order = 4) {
    if (!Number.isInteger(order)) {
      throw new TypeError('B+ tree order must be an integer')
    }

    if (order < 3) {
      throw new RangeError('B+ tree order must be at least 3')
    }

    this.order = order
    this.root = new LeafNode(order)
    this.size = 0
    this.keyType = null
    this.lastOperation = []
  }

  get isEmpty() {
    return this.size === 0
  }

  /**
   * Inserts a key/value pair while keeping all leaves sorted.
   * An existing key is updated because keys act like database primary keys.
   */
  insert(key, value = key) {
    this.#validateInsertKey(key)
    this.lastOperation = []

    const path = []
    const leaf = this.#findLeaf(key, path)
    this.#recordPath(path, key)
    const index = this.#lowerBound(leaf.keys, key)

    if (
      index < leaf.keys.length &&
      this.#compareKeys(leaf.keys[index], key) === 0
    ) {
      leaf.values[index] = value
      this.#recordEvent(
        'update',
        'Update existing record',
        `Key ${key} already exists, so its stored value was replaced.`,
        [leaf],
      )
      return { inserted: false, updated: true }
    }

    leaf.keys.splice(index, 0, key)
    leaf.values.splice(index, 0, value)
    this.size += 1
    this.#recordEvent(
      'insert',
      'Insert into leaf',
      `Key ${key} was placed at sorted position ${index + 1}.`,
      [leaf],
    )

    if (leaf.keys.length > leaf.maxKeys) {
      this.#splitLeaf(leaf)
    }

    return { inserted: true, updated: false }
  }

  /**
   * Returns the value associated with a key, or undefined when it is absent.
   */
  search(key) {
    this.#validateQueryKey(key)

    const leaf = this.#findLeaf(key)
    const index = this.#lowerBound(leaf.keys, key)
    const found =
      index < leaf.keys.length &&
      this.#compareKeys(leaf.keys[index], key) === 0

    return found ? leaf.values[index] : undefined
  }

  /**
   * Performs an exact search and records each visited node for visualization.
   */
  searchWithPath(key) {
    this.#validateQueryKey(key)

    const path = []
    const leaf = this.#findLeaf(key, path)
    const index = this.#lowerBound(leaf.keys, key)
    const found =
      index < leaf.keys.length &&
      this.#compareKeys(leaf.keys[index], key) === 0

    return {
      key,
      found,
      value: found ? leaf.values[index] : undefined,
      index,
      path,
    }
  }

  /**
   * Returns all records whose keys are inside the inclusive range.
   */
  rangeSearch(startKey, endKey) {
    return this.rangeSearchWithPath(startKey, endKey).records
  }

  /**
   * Returns range records plus the descent path and scanned leaf nodes.
   */
  rangeSearchWithPath(startKey, endKey) {
    this.#validateQueryKey(startKey)
    this.#validateQueryKey(endKey)

    if (typeof startKey !== typeof endKey) {
      throw new TypeError('Range boundaries must use the same key type')
    }

    if (this.#compareKeys(startKey, endKey) > 0) {
      throw new RangeError('Range start key cannot be greater than end key')
    }

    const records = []
    const path = []
    const leaves = []
    let leaf = this.#findLeaf(startKey, path)

    while (leaf !== null) {
      leaves.push(leaf)

      for (let index = 0; index < leaf.keys.length; index += 1) {
        const key = leaf.keys[index]

        if (this.#compareKeys(key, startKey) < 0) {
          continue
        }

        if (this.#compareKeys(key, endKey) > 0) {
          return { records, path, leaves }
        }

        records.push({ key, value: leaf.values[index] })
      }

      leaf = leaf.next
    }

    return { records, path, leaves }
  }

  /**
   * Deletes a key and rebalances the tree when a node becomes too small.
   */
  delete(key) {
    this.#validateQueryKey(key)
    this.lastOperation = []

    const path = []
    const leaf = this.#findLeaf(key, path)
    this.#recordPath(path, key)
    const index = this.#lowerBound(leaf.keys, key)
    const found =
      index < leaf.keys.length &&
      this.#compareKeys(leaf.keys[index], key) === 0

    if (!found) {
      this.#recordEvent(
        'not-found',
        'Key not found',
        `Key ${key} is not present in the target leaf.`,
        [leaf],
      )
      return { deleted: false, value: undefined }
    }

    const [value] = leaf.values.splice(index, 1)
    leaf.keys.splice(index, 1)
    this.size -= 1
    this.#recordEvent(
      'delete',
      'Delete from leaf',
      `Key ${key} and its record were removed from the leaf.`,
      [leaf],
    )

    if (this.size === 0) {
      this.root = new LeafNode(this.order)
      this.keyType = null
      this.#recordEvent(
        'empty-tree',
        'Tree is now empty',
        'The root was reset to one empty leaf node.',
        [this.root],
      )
      return { deleted: true, value }
    }

    if (!leaf.isRoot && leaf.keys.length < this.#minimumLeafKeys()) {
      this.#rebalanceLeaf(leaf)
    }

    this.#rebuildSeparatorKeys(this.root)
    return { deleted: true, value }
  }

  #validateInsertKey(key) {
    this.#assertSupportedKey(key)
    this.#assertCompatibleKeyType(key)

    if (this.keyType === null) {
      this.keyType = typeof key
    }
  }

  #validateQueryKey(key) {
    this.#assertSupportedKey(key)
    this.#assertCompatibleKeyType(key)
  }

  #assertSupportedKey(key) {
    const type = typeof key
    const isSupportedType = type === 'number' || type === 'string'

    if (!isSupportedType || (type === 'number' && !Number.isFinite(key))) {
      throw new TypeError('B+ tree keys must be finite numbers or strings')
    }
  }

  #assertCompatibleKeyType(key) {
    const type = typeof key

    if (this.keyType !== null && this.keyType !== type) {
      throw new TypeError(
        `Cannot mix ${type} keys with existing ${this.keyType} keys`,
      )
    }
  }

  #compareKeys(left, right) {
    if (left === right) {
      return 0
    }

    return left < right ? -1 : 1
  }

  #lowerBound(keys, key) {
    let low = 0
    let high = keys.length

    while (low < high) {
      const middle = Math.floor((low + high) / 2)

      if (this.#compareKeys(keys[middle], key) < 0) {
        low = middle + 1
      } else {
        high = middle
      }
    }

    return low
  }

  #minimumLeafKeys() {
    return Math.ceil((this.order - 1) / 2)
  }

  #minimumInternalChildren() {
    return Math.ceil(this.order / 2)
  }

  #findLeaf(key, path = null) {
    let node = this.root

    while (!node.isLeaf) {
      let childIndex = 0

      while (
        childIndex < node.keys.length &&
        this.#compareKeys(key, node.keys[childIndex]) >= 0
      ) {
        childIndex += 1
      }

      if (path !== null) {
        path.push({
          node,
          keys: [...node.keys],
          childIndex,
        })
      }

      node = node.children[childIndex]
    }

    if (path !== null) {
      path.push({
        node,
        keys: [...node.keys],
        childIndex: null,
      })
    }

    return node
  }

  #splitLeaf(leaf) {
    const splitIndex = Math.ceil(leaf.keys.length / 2)
    const rightLeaf = new LeafNode(this.order)

    rightLeaf.keys = leaf.keys.splice(splitIndex)
    rightLeaf.values = leaf.values.splice(splitIndex)
    rightLeaf.next = leaf.next
    leaf.next = rightLeaf

    this.#recordEvent(
      'split-leaf',
      'Split overflowing leaf',
      `The leaf exceeded ${leaf.maxKeys} keys and was divided into two linked leaves.`,
      [leaf, rightLeaf],
    )

    this.#insertIntoParent(leaf, rightLeaf.keys[0], rightLeaf)
  }

  #insertIntoParent(leftNode, separatorKey, rightNode) {
    const parent = leftNode.parent

    if (parent === null) {
      const newRoot = new InternalNode(this.order)
      newRoot.keys.push(separatorKey)
      newRoot.children.push(leftNode, rightNode)
      leftNode.parent = newRoot
      rightNode.parent = newRoot
      this.root = newRoot
      this.#recordEvent(
        'new-root',
        'Create a new root',
        `Separator key ${separatorKey} became the first key of a new root.`,
        [newRoot, leftNode, rightNode],
      )
      return
    }

    const leftIndex = parent.children.indexOf(leftNode)

    if (leftIndex === -1) {
      throw new Error('Tree invariant broken: parent does not contain child')
    }

    parent.keys.splice(leftIndex, 0, separatorKey)
    parent.children.splice(leftIndex + 1, 0, rightNode)
    rightNode.parent = parent
    this.#recordEvent(
      'promote',
      'Promote separator key',
      `Separator key ${separatorKey} was inserted into the parent node.`,
      [parent, rightNode],
    )

    if (parent.keys.length > parent.maxKeys) {
      this.#splitInternal(parent)
    }
  }

  #splitInternal(node) {
    const middleIndex = Math.floor(node.keys.length / 2)
    const separatorKey = node.keys[middleIndex]
    const rightNode = new InternalNode(this.order)

    rightNode.keys = node.keys.slice(middleIndex + 1)
    rightNode.children = node.children.slice(middleIndex + 1)

    node.keys = node.keys.slice(0, middleIndex)
    node.children = node.children.slice(0, middleIndex + 1)

    for (const child of rightNode.children) {
      child.parent = rightNode
    }

    this.#recordEvent(
      'split-internal',
      'Split internal node',
      `The internal node overflowed, so separator key ${separatorKey} moved upward.`,
      [node, rightNode],
    )

    this.#insertIntoParent(node, separatorKey, rightNode)
  }

  #rebalanceLeaf(leaf) {
    const parent = leaf.parent
    const leafIndex = parent.children.indexOf(leaf)
    const leftSibling = parent.children[leafIndex - 1] ?? null
    const rightSibling = parent.children[leafIndex + 1] ?? null
    const minimumKeys = this.#minimumLeafKeys()

    if (leftSibling !== null && leftSibling.keys.length > minimumKeys) {
      leaf.keys.unshift(leftSibling.keys.pop())
      leaf.values.unshift(leftSibling.values.pop())
      this.#recordEvent(
        'borrow-left',
        'Borrow from left leaf',
        'The underfilled leaf borrowed the largest record from its left sibling.',
        [leftSibling, leaf],
      )
      return
    }

    if (rightSibling !== null && rightSibling.keys.length > minimumKeys) {
      leaf.keys.push(rightSibling.keys.shift())
      leaf.values.push(rightSibling.values.shift())
      this.#recordEvent(
        'borrow-right',
        'Borrow from right leaf',
        'The underfilled leaf borrowed the smallest record from its right sibling.',
        [leaf, rightSibling],
      )
      return
    }

    if (leftSibling !== null) {
      leftSibling.keys.push(...leaf.keys)
      leftSibling.values.push(...leaf.values)
      leftSibling.next = leaf.next
      parent.children.splice(leafIndex, 1)
      parent.keys.splice(leafIndex - 1, 1)
      leaf.parent = null
      leaf.next = null
      this.#recordEvent(
        'merge-leaf',
        'Merge leaf nodes',
        'The underfilled leaf was merged into its left sibling.',
        [leftSibling, leaf],
      )
    } else if (rightSibling !== null) {
      leaf.keys.push(...rightSibling.keys)
      leaf.values.push(...rightSibling.values)
      leaf.next = rightSibling.next
      parent.children.splice(leafIndex + 1, 1)
      parent.keys.splice(leafIndex, 1)
      rightSibling.parent = null
      rightSibling.next = null
      this.#recordEvent(
        'merge-leaf',
        'Merge leaf nodes',
        'The right sibling was merged into the underfilled leaf.',
        [leaf, rightSibling],
      )
    } else {
      throw new Error('Tree invariant broken: leaf has no sibling')
    }

    this.#rebalanceInternal(parent)
  }

  #rebalanceInternal(node) {
    if (node.isRoot) {
      if (node.children.length === 1) {
        this.root = node.children[0]
        this.root.parent = null
        this.#recordEvent(
          'collapse-root',
          'Reduce tree height',
          'The old root had one child, so that child became the new root.',
          [this.root],
        )
      }

      return
    }

    const minimumChildren = this.#minimumInternalChildren()

    if (node.children.length >= minimumChildren) {
      return
    }

    const parent = node.parent
    const nodeIndex = parent.children.indexOf(node)
    const leftSibling = parent.children[nodeIndex - 1] ?? null
    const rightSibling = parent.children[nodeIndex + 1] ?? null

    if (
      leftSibling !== null &&
      leftSibling.children.length > minimumChildren
    ) {
      const borrowedChild = leftSibling.children.pop()
      node.children.unshift(borrowedChild)
      borrowedChild.parent = node
      this.#recordEvent(
        'borrow-internal-left',
        'Borrow an internal child',
        'The internal node borrowed the rightmost child from its left sibling.',
        [leftSibling, node],
      )
      return
    }

    if (
      rightSibling !== null &&
      rightSibling.children.length > minimumChildren
    ) {
      const borrowedChild = rightSibling.children.shift()
      node.children.push(borrowedChild)
      borrowedChild.parent = node
      this.#recordEvent(
        'borrow-internal-right',
        'Borrow an internal child',
        'The internal node borrowed the leftmost child from its right sibling.',
        [node, rightSibling],
      )
      return
    }

    if (leftSibling !== null) {
      leftSibling.children.push(...node.children)

      for (const child of node.children) {
        child.parent = leftSibling
      }

      parent.children.splice(nodeIndex, 1)
      parent.keys.splice(nodeIndex - 1, 1)
      node.parent = null
      this.#recordEvent(
        'merge-internal',
        'Merge internal nodes',
        'The underfilled internal node was merged into its left sibling.',
        [leftSibling, node],
      )
    } else if (rightSibling !== null) {
      node.children.push(...rightSibling.children)

      for (const child of rightSibling.children) {
        child.parent = node
      }

      parent.children.splice(nodeIndex + 1, 1)
      parent.keys.splice(nodeIndex, 1)
      rightSibling.parent = null
      this.#recordEvent(
        'merge-internal',
        'Merge internal nodes',
        'The right internal sibling was merged into the underfilled node.',
        [node, rightSibling],
      )
    } else {
      throw new Error('Tree invariant broken: internal node has no sibling')
    }

    this.#rebalanceInternal(parent)
  }

  #rebuildSeparatorKeys(node) {
    if (node.isLeaf) {
      return node.keys[0]
    }

    const childMinimums = node.children.map((child) =>
      this.#rebuildSeparatorKeys(child),
    )

    node.keys = childMinimums.slice(1)
    return childMinimums[0]
  }

  #recordPath(path, key) {
    for (const step of path) {
      if (step.node.isLeaf) {
        this.#recordEvent(
          'visit-leaf',
          'Inspect target leaf',
          `Check the sorted leaf keys for ${key}.`,
          [step.node],
        )
      } else {
        this.#recordEvent(
          'visit-internal',
          'Follow an internal pointer',
          `Compare ${key} with the separators and follow child ${step.childIndex + 1}.`,
          [step.node],
        )
      }
    }
  }

  #recordEvent(type, title, message, nodes) {
    const affectedNodes = nodes.filter(Boolean)

    this.lastOperation.push({
      id: `step-${this.lastOperation.length + 1}`,
      type,
      title,
      message,
      nodes: affectedNodes,
      nodeSnapshots: affectedNodes.map((node) => ({
        isLeaf: node.isLeaf,
        keys: [...node.keys],
      })),
    })
  }
}

export { BPlusTree }
export default BPlusTree
