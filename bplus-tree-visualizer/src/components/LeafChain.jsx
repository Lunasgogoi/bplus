function LeafChain({ leafNodes, markerId }) {
  const orderedLeaves = [...leafNodes].sort((left, right) => left.x - right.x)

  return (
    <g className="leaf-chain" aria-label="Linked leaf nodes">
      {orderedLeaves.slice(0, -1).map((leaf, index) => {
        const nextLeaf = orderedLeaves[index + 1]

        if (leaf.node.next !== nextLeaf.node) {
          return null
        }

        const startX = leaf.x + leaf.width + 5
        const endX = nextLeaf.x - 7
        const centerY = leaf.y + leaf.height / 2
        const curveY = centerY + 24

        return (
          <path
            className="leaf-chain__link"
            d={`M ${startX} ${centerY} C ${startX + 12} ${curveY}, ${endX - 12} ${curveY}, ${endX} ${centerY}`}
            key={`${leaf.id}-${nextLeaf.id}`}
            markerEnd={`url(#${markerId})`}
          />
        )
      })}
    </g>
  )
}

export default LeafChain
