const DEFAULT_LAYOUT_OPTIONS = Object.freeze({
  keyWidth: 46,
  nodeHeight: 54,
  minNodeWidth: 82,
  paddingX: 16,
  horizontalGap: 36,
  verticalGap: 74,
  margin: 32,
})

/**
 * Produces deterministic coordinates for an SVG tree renderer.
 */
function calculateTreeLayout(root, customOptions = {}) {
  if (root === null || typeof root !== 'object') {
    throw new TypeError('A root node is required')
  }

  const options = resolveOptions(customOptions)
  const measurements = new Map()

  function measure(node) {
    const width = Math.max(
      options.minNodeWidth,
      node.keys.length * options.keyWidth + options.paddingX * 2,
    )
    const childMeasurements = node.isLeaf
      ? []
      : node.children.map((child) => measure(child))
    const childrenWidth = childMeasurements.reduce(
      (total, child, index) =>
        total + child.subtreeWidth + (index === 0 ? 0 : options.horizontalGap),
      0,
    )
    const measurement = {
      node,
      width,
      childMeasurements,
      childrenWidth,
      subtreeWidth: Math.max(width, childrenWidth),
    }

    measurements.set(node, measurement)
    return measurement
  }

  const rootMeasurement = measure(root)
  const nodes = []
  const edges = []
  const levels = []
  let nextNodeId = 0
  let maximumDepth = 0

  function place(measurement, left, depth) {
    const id = `node-${nextNodeId}`
    const centerX = left + measurement.subtreeWidth / 2
    const x = centerX - measurement.width / 2
    const y = options.margin + depth * (options.nodeHeight + options.verticalGap)
    const layoutNode = {
      id,
      node: measurement.node,
      type: measurement.node.isLeaf ? 'leaf' : 'internal',
      keys: [...measurement.node.keys],
      depth,
      x,
      y,
      width: measurement.width,
      height: options.nodeHeight,
      centerX,
    }

    nextNodeId += 1
    maximumDepth = Math.max(maximumDepth, depth)
    nodes.push(layoutNode)
    levels[depth] ??= []
    levels[depth].push(layoutNode)

    if (measurement.childMeasurements.length === 0) {
      return layoutNode
    }

    let childLeft =
      left + (measurement.subtreeWidth - measurement.childrenWidth) / 2

    for (const childMeasurement of measurement.childMeasurements) {
      const childNode = place(childMeasurement, childLeft, depth + 1)

      edges.push({
        id: `${id}-${childNode.id}`,
        parentId: id,
        childId: childNode.id,
        x1: layoutNode.centerX,
        y1: layoutNode.y + layoutNode.height,
        x2: childNode.centerX,
        y2: childNode.y,
      })

      childLeft += childMeasurement.subtreeWidth + options.horizontalGap
    }

    return layoutNode
  }

  place(rootMeasurement, options.margin, 0)

  const width = rootMeasurement.subtreeWidth + options.margin * 2
  const height =
    options.margin * 2 +
    options.nodeHeight +
    maximumDepth * (options.nodeHeight + options.verticalGap)

  return {
    nodes,
    edges,
    levels,
    width,
    height,
    viewBox: `0 0 ${width} ${height}`,
    options,
  }
}

function resolveOptions(customOptions) {
  const options = { ...DEFAULT_LAYOUT_OPTIONS, ...customOptions }

  for (const [name, value] of Object.entries(options)) {
    const permitsZero = name === 'margin'
    const isValid =
      Number.isFinite(value) && (permitsZero ? value >= 0 : value > 0)

    if (!isValid) {
      throw new RangeError(`Layout option ${name} must be a valid size`)
    }
  }

  return options
}

export { calculateTreeLayout, DEFAULT_LAYOUT_OPTIONS }
export default calculateTreeLayout
