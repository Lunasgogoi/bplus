import BPlusTreeNode from './BPlusTreeNode.js'

/**
 * A non-leaf node containing separator keys and child references.
 */
class InternalNode extends BPlusTreeNode {
  constructor(order) {
    super(order, false)
    this.children = []
  }

  get childCount() {
    return this.children.length
  }
}

export { InternalNode }
export default InternalNode
