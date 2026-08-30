import { useId } from 'react'

import calculateTreeLayout from '../utils/treeLayout.js'
import LeafChain from './LeafChain.jsx'
import TreeNode from './TreeNode.jsx'

function TreeVisualizer({
  tree,
  highlightedNodes = new Set(),
  highlightedKeys = new Set(),
  activeKey,
  title = 'B+ tree visualization',
}) {
  const generatedId = useId().replaceAll(':', '')
  const markerId = `leaf-arrow-${generatedId}`
  const titleId = `tree-title-${generatedId}`

  if (tree?.root === undefined) {
    return <div className="tree-visualizer__empty">No tree is available.</div>
  }

  const layout = calculateTreeLayout(tree.root)
  const minimumCanvasWidth = Math.max(layout.width, 760)
  const leafNodes = layout.nodes.filter((node) => node.type === 'leaf')
  const isHighlighted = (node) =>
    highlightedNodes instanceof Set
      ? highlightedNodes.has(node)
      : highlightedNodes.includes(node)

  return (
    <div className="tree-visualizer__viewport">
      <svg
        className="tree-canvas"
        viewBox={layout.viewBox}
        style={{ minWidth: `${minimumCanvasWidth}px` }}
        role="img"
        aria-labelledby={titleId}
        preserveAspectRatio="xMidYMin meet"
      >
        <title id={titleId}>{title}</title>
        <defs>
          <pattern
            id={`grid-${generatedId}`}
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r="1" className="tree-canvas__grid-dot" />
          </pattern>
          <marker
            id={markerId}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path className="leaf-chain__arrow" d="M 0 0 L 10 5 L 0 10 z" />
          </marker>
        </defs>

        <rect
          width={layout.width}
          height={layout.height}
          fill={`url(#grid-${generatedId})`}
        />

        <g className="tree-edges" aria-hidden="true">
          {layout.edges.map((edge) => {
            const parent = layout.nodes.find((node) => node.id === edge.parentId)
            const child = layout.nodes.find((node) => node.id === edge.childId)
            const midpointY = (edge.y1 + edge.y2) / 2
            const highlighted =
              isHighlighted(parent.node) && isHighlighted(child.node)

            return (
              <path
                className={highlighted ? 'tree-edge tree-edge--highlighted' : 'tree-edge'}
                d={`M ${edge.x1} ${edge.y1} C ${edge.x1} ${midpointY}, ${edge.x2} ${midpointY}, ${edge.x2} ${edge.y2}`}
                key={edge.id}
              />
            )
          })}
        </g>

        <LeafChain leafNodes={leafNodes} markerId={markerId} />

        <g className="tree-nodes">
          {layout.nodes.map((layoutNode) => (
            <TreeNode
              activeKey={activeKey}
              highlightedKeys={highlightedKeys}
              isHighlighted={isHighlighted(layoutNode.node)}
              key={layoutNode.id}
              keyWidth={layout.options.keyWidth}
              layoutNode={layoutNode}
            />
          ))}
        </g>
      </svg>
    </div>
  )
}

export default TreeVisualizer
