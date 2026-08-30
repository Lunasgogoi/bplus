import BPlusTreeNode from './BPlusTreeNode.js'

/**
 * A leaf node containing keys and their associated values.
 *
 * Leaf nodes form a linked list through `next`. This will later allow range
 * scans to move through sorted data without walking back through the tree.
 */
class LeafNode extends BPlusTreeNode {
  constructor(order) {
    super(order, true)
    this.values = []
    this.next = null
  }
}

export { LeafNode }
export default LeafNode
