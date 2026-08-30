/**
 * Base class shared by internal and leaf nodes.
 *
 * The tree order is the maximum number of children an internal node can have.
 * Consequently, every node can store at most `order - 1` keys.
 */
class BPlusTreeNode {
  constructor(order, isLeaf) {
    if (!Number.isInteger(order)) {
      throw new TypeError('B+ tree order must be an integer')
    }

    if (order < 3) {
      throw new RangeError('B+ tree order must be at least 3')
    }

    if (typeof isLeaf !== 'boolean') {
      throw new TypeError('Node type must be identified by a boolean')
    }

    this.order = order
    this.keys = []
    this.parent = null
    this.isLeaf = isLeaf
  }

  get maxKeys() {
    return this.order - 1
  }

  get keyCount() {
    return this.keys.length
  }

  get isRoot() {
    return this.parent === null
  }
}

export { BPlusTreeNode }
export default BPlusTreeNode
