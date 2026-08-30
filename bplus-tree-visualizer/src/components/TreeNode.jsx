function TreeNode({
  layoutNode,
  keyWidth,
  isHighlighted,
  activeKey,
  highlightedKeys,
}) {
  const { node, keys, x, y, width, height } = layoutNode
  const label = node.isRoot ? 'Root' : node.isLeaf ? 'Leaf' : 'Internal'
  const classNames = [
    'tree-node',
    node.isLeaf ? 'tree-node--leaf' : 'tree-node--internal',
    isHighlighted ? 'tree-node--highlighted' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const keysWidth = keys.length * keyWidth
  const keysStart = (width - keysWidth) / 2
  const accessibleKeys = keys.length > 0 ? keys.join(', ') : 'empty'

  return (
    <g
      className={classNames}
      transform={`translate(${x} ${y})`}
      aria-label={`${label} node containing ${accessibleKeys}`}
    >
      <title>{`${label} node: ${accessibleKeys}`}</title>
      <text className="tree-node__label" x={width / 2} y={-10}>
        {label}
      </text>
      <rect
        className="tree-node__surface"
        width={width}
        height={height}
        rx="12"
      />

      {keys.length === 0 ? (
        <text className="tree-node__empty" x={width / 2} y={height / 2 + 5}>
          empty
        </text>
      ) : (
        keys.map((key, index) => {
          const isActive = Object.is(key, activeKey)
          const isRangeMatch = node.isLeaf && highlightedKeys.has(key)
          const keyClassName = isActive
            ? 'tree-node__key tree-node__key--active'
            : isRangeMatch
              ? 'tree-node__key tree-node__key--range'
              : 'tree-node__key'

          return (
            <g
              className={keyClassName}
              key={`${typeof key}-${String(key)}`}
              transform={`translate(${keysStart + index * keyWidth} 0)`}
            >
              <rect width={keyWidth} height={height} rx="8" />
              <text x={keyWidth / 2} y={height / 2 + 5}>
                {String(key)}
              </text>
            </g>
          )
        })
      )}

      {node.isLeaf && (
        <circle
          className="tree-node__leaf-port"
          cx={width - 9}
          cy={height / 2}
          r="3.5"
        />
      )}
    </g>
  )
}

export default TreeNode
