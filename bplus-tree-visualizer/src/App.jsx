import { useEffect, useReducer, useRef, useState } from 'react'

import ControlPanel from './components/ControlPanel.jsx'
import OperationHistory from './components/OperationHistory.jsx'
import OperationPlayback from './components/OperationPlayback.jsx'
import StatisticsPanel from './components/StatisticsPanel.jsx'
import TreeVisualizer from './components/TreeVisualizer.jsx'
import BPlusTree from './engine/BPlusTree.js'
import calculateTreeStats from './utils/treeStats.js'

function createDemoTree() {
  const tree = new BPlusTree(4)
  const keys = [8, 14, 19, 25, 31, 36, 42, 48, 53, 59, 64, 71, 78, 84, 91]

  for (const key of keys) {
    tree.insert(key, `Record ${key}`)
  }

  return tree
}

function createRandomTree(order, recordCount = 18) {
  const tree = new BPlusTree(order)
  const keys = new Set()

  while (keys.size < recordCount) {
    keys.add(Math.floor(Math.random() * 96) + 2)
  }

  for (const key of keys) {
    tree.insert(key, `Record ${key}`)
  }

  return tree
}

function createSearchEvents(result, key) {
  const events = result.path.map((step, index) => ({
    id: `search-step-${index + 1}`,
    type: step.node.isLeaf ? 'visit-leaf' : 'visit-internal',
    title: step.node.isLeaf ? 'Inspect target leaf' : 'Follow an internal pointer',
    message: step.node.isLeaf
      ? `Check the sorted leaf keys for ${key}.`
      : `Compare ${key} with the separators and follow child ${step.childIndex + 1}.`,
    nodes: [step.node],
    nodeSnapshots: [{ isLeaf: step.node.isLeaf, keys: [...step.keys] }],
  }))

  events.push({
    id: 'search-result',
    type: result.found ? 'found' : 'not-found',
    title: result.found ? `Key ${key} found` : `Key ${key} not found`,
    message: result.found
      ? `The leaf contains the requested record at slot ${result.index + 1}.`
      : 'The target leaf does not contain the requested key.',
    nodes: [result.path.at(-1).node],
    nodeSnapshots: [{ isLeaf: true, keys: [...result.path.at(-1).keys] }],
  })

  return events
}

function createRangeEvents(result, startKey, endKey) {
  const internalSteps = result.path.filter((step) => !step.node.isLeaf)
  const events = internalSteps.map((step, index) => ({
    id: `range-descent-${index + 1}`,
    type: 'visit-internal',
    title: 'Find the first range leaf',
    message: `Compare ${startKey} with the separators and follow child ${step.childIndex + 1}.`,
    nodes: [step.node],
    nodeSnapshots: [{ isLeaf: false, keys: [...step.keys] }],
  }))

  for (const [index, leaf] of result.leaves.entries()) {
    const matchingKeys = leaf.keys.filter(
      (key) => key >= startKey && key <= endKey,
    )

    events.push({
      id: `range-leaf-${index + 1}`,
      type: 'range-leaf',
      title: 'Scan linked leaf',
      message:
        matchingKeys.length > 0
          ? `Collect matching keys ${matchingKeys.join(', ')} from this leaf.`
          : 'This leaf contains no keys inside the requested range.',
      nodes: [leaf],
      nodeSnapshots: [{ isLeaf: true, keys: [...leaf.keys] }],
    })
  }

  events.push({
    id: 'range-result',
    type: 'range-result',
    title: `${result.records.length} range result${result.records.length === 1 ? '' : 's'}`,
    message:
      result.records.length > 0
        ? `The inclusive scan returned keys ${result.records.map((record) => record.key).join(', ')}.`
        : `No keys were found between ${startKey} and ${endKey}.`,
    nodes: result.leaves,
    nodeSnapshots: result.leaves.map((leaf) => ({
      isLeaf: true,
      keys: [...leaf.keys],
    })),
  })

  return events
}

function App() {
  const [tree, setTree] = useState(createDemoTree)
  const [, forceRender] = useReducer((version) => version + 1, 0)
  const historyId = useRef(1)
  const [playback, setPlayback] = useState(() => {
    const events = createSearchEvents(tree.searchWithPath(42), 42)

    return {
      events,
      currentIndex: events.length - 1,
      isPlaying: false,
      activeKey: 42,
      highlightedKeys: new Set([42]),
    }
  })
  const [feedback, setFeedback] = useState({
    type: 'info',
    title: 'Demo ready',
    message: 'Search for key 42 to inspect its path.',
  })
  const [history, setHistory] = useState([
    {
      id: 0,
      type: 'dataset',
      title: 'Demo dataset loaded',
      detail: '15 numeric records',
    },
  ])
  const stats = calculateTreeStats(tree)
  const currentEvent = playback.events[playback.currentIndex]
  const highlightedNodes = new Set(currentEvent?.nodes ?? [])

  useEffect(() => {
    if (!playback.isPlaying) {
      return undefined
    }

    const timer = window.setTimeout(() => {
      setPlayback((current) => {
        const nextIndex = Math.min(
          current.events.length - 1,
          current.currentIndex + 1,
        )

        return {
          ...current,
          currentIndex: nextIndex,
          isPlaying: nextIndex < current.events.length - 1,
        }
      })
    }, 720)

    return () => window.clearTimeout(timer)
  }, [playback.currentIndex, playback.events.length, playback.isPlaying])

  const addHistory = (type, title, detail) => {
    const entry = { id: historyId.current, type, title, detail }

    historyId.current += 1
    setHistory((current) => [entry, ...current].slice(0, 8))
  }

  const startPlayback = (
    events,
    { activeKey = null, highlightedKeys = [] } = {},
  ) => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    setPlayback({
      events: [...events],
      currentIndex: 0,
      isPlaying: events.length > 1 && !reduceMotion,
      activeKey,
      highlightedKeys: new Set(highlightedKeys),
    })
  }

  const handleInsert = (key, value) => {
    const result = tree.insert(key, value)
    forceRender()
    startPlayback(tree.lastOperation, {
      activeKey: key,
      highlightedKeys: [key],
    })
    setFeedback({
      type: 'success',
      title: result.updated ? 'Record updated' : 'Record inserted',
      message: result.updated
        ? `Key ${key} now stores "${value}".`
        : `Key ${key} was added and the tree was rebalanced.`,
    })
    addHistory(
      result.updated ? 'update' : 'insert',
      result.updated ? `Updated key ${key}` : `Inserted key ${key}`,
      `${tree.size} records in tree`,
    )
  }

  const handleSearch = (key) => {
    const result = tree.searchWithPath(key)

    startPlayback(createSearchEvents(result, key), {
      activeKey: result.found ? key : null,
      highlightedKeys: result.found ? [key] : [],
    })
    setFeedback(
      result.found
        ? {
            type: 'success',
            title: `Key ${key} found`,
            message: `Stored value: ${String(result.value)}`,
          }
        : {
            type: 'warning',
            title: `Key ${key} not found`,
            message: 'The visited path is highlighted in the tree.',
          },
    )
    addHistory(
      'search',
      result.found ? `Found key ${key}` : `Key ${key} not found`,
      `${result.path.length} nodes visited`,
    )
  }

  const handleDelete = (key) => {
    const result = tree.delete(key)

    if (result.deleted) {
      forceRender()
      startPlayback(tree.lastOperation)
      setFeedback({
        type: 'success',
        title: `Key ${key} deleted`,
        message: 'The tree was rebalanced and separator keys were updated.',
      })
      addHistory('delete', `Deleted key ${key}`, `${tree.size} records remain`)
      return
    }

    startPlayback(tree.lastOperation)
    setFeedback({
      type: 'warning',
      title: `Key ${key} not found`,
      message: 'No records were changed.',
    })
    addHistory('delete', `Key ${key} not found`, 'No records changed')
  }

  const handleRangeSearch = (startKey, endKey) => {
    const result = tree.rangeSearchWithPath(startKey, endKey)
    const keys = result.records.map((record) => record.key)

    startPlayback(createRangeEvents(result, startKey, endKey), {
      highlightedKeys: keys,
    })
    setFeedback({
      type: result.records.length > 0 ? 'success' : 'warning',
      title: `${result.records.length} range result${result.records.length === 1 ? '' : 's'}`,
      message:
        result.records.length > 0
          ? `Keys returned: ${keys.join(', ')}.`
          : `No records exist from ${startKey} through ${endKey}.`,
    })
    addHistory(
      'range',
      `Scanned ${startKey} to ${endKey}`,
      `${result.records.length} records returned`,
    )
  }

  const replaceTree = (nextTree, message, eventType = 'reset') => {
    setTree(nextTree)
    setPlayback({
      events: [
        {
          id: 'fresh-tree',
          type: eventType,
          title: message.title,
          message: message.message,
          nodes: [nextTree.root],
          nodeSnapshots: [{
            isLeaf: nextTree.root.isLeaf,
            keys: [...nextTree.root.keys],
          }],
        },
      ],
      currentIndex: 0,
      isPlaying: false,
      activeKey: null,
      highlightedKeys: new Set(),
    })
    setFeedback(message)
  }

  const handlePreviousStep = () => {
    setPlayback((current) => ({
      ...current,
      currentIndex: Math.max(0, current.currentIndex - 1),
      isPlaying: false,
    }))
  }

  const handleNextStep = () => {
    setPlayback((current) => ({
      ...current,
      currentIndex: Math.min(
        current.events.length - 1,
        current.currentIndex + 1,
      ),
      isPlaying: false,
    }))
  }

  const handleTogglePlayback = () => {
    setPlayback((current) => ({
      ...current,
      currentIndex:
        current.currentIndex === current.events.length - 1
          ? 0
          : current.currentIndex,
      isPlaying: !current.isPlaying,
    }))
  }

  const handleSelectStep = (index) => {
    setPlayback((current) => ({
      ...current,
      currentIndex: index,
      isPlaying: false,
    }))
  }

  const handleOrderChange = (order) => {
    replaceTree(
      new BPlusTree(order),
      {
        type: 'info',
        title: `Order changed to ${order}`,
        message: `The new tree can hold up to ${order - 1} keys per node.`,
      },
      'order',
    )
    addHistory('order', `Changed to order ${order}`, 'Started an empty tree')
  }

  const handleReset = () => {
    replaceTree(new BPlusTree(tree.order), {
      type: 'info',
      title: 'Tree cleared',
      message: `A fresh empty order-${tree.order} tree is ready.`,
    })
    addHistory('reset', 'Cleared the tree', `Order ${tree.order} preserved`)
  }

  const handleGenerateRandom = () => {
    const nextTree = createRandomTree(tree.order)

    replaceTree(
      nextTree,
      {
        type: 'success',
        title: 'Random dataset generated',
        message: `Created 18 unique records in an order-${tree.order} tree.`,
      },
      'dataset',
    )
    addHistory('dataset', 'Generated random dataset', '18 unique records')
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">B+</span>
          <div>
            <p className="brand__eyebrow">Database structures lab</p>
            <h1>B+ Tree Visualizer</h1>
          </div>
        </div>
      </header>

      <main className="app-main">
        <section className="intro" aria-labelledby="page-heading">
          <div>
            <p className="section-kicker">Structure explorer</p>
            <h2 id="page-heading">See how records stay balanced and searchable.</h2>
            <p>
              Internal nodes guide the route. Leaf nodes hold the records and
              remain linked for fast range scans.
            </p>
          </div>
          <div className="tree-summary" aria-label="Current tree summary">
            <span>Order {stats.order}</span>
            <span>{stats.recordCount} records</span>
            <span>{stats.height} levels</span>
          </div>
        </section>

        <div className="workspace-grid">
          <aside className="workspace-sidebar" aria-label="Tree controls and statistics">
            <ControlPanel
              feedback={feedback}
              onDelete={handleDelete}
              onGenerateRandom={handleGenerateRandom}
              onInsert={handleInsert}
              onOrderChange={handleOrderChange}
              onRangeSearch={handleRangeSearch}
              onReset={handleReset}
              onSearch={handleSearch}
              order={tree.order}
            />
            <StatisticsPanel stats={stats} />
            <OperationHistory entries={history} />
          </aside>

          <section className="visualizer-card" aria-labelledby="visualizer-title">
            <div className="visualizer-card__header">
              <div>
                <p className="section-kicker">Current structure</p>
                <h2 id="visualizer-title">Tree topology</h2>
              </div>
            </div>

            <TreeVisualizer
              activeKey={playback.activeKey}
              highlightedKeys={playback.highlightedKeys}
              highlightedNodes={highlightedNodes}
              tree={tree}
            />

            <OperationPlayback
              currentIndex={playback.currentIndex}
              events={playback.events}
              isPlaying={playback.isPlaying}
              onNext={handleNextStep}
              onPrevious={handlePreviousStep}
              onSelectStep={handleSelectStep}
              onTogglePlayback={handleTogglePlayback}
            />

            <div className="visualizer-legend" aria-label="Visualization legend">
              <span><i className="legend-dot legend-dot--internal" />Internal node</span>
              <span><i className="legend-dot legend-dot--leaf" />Leaf node</span>
              <span><i className="legend-dot legend-dot--active" />Search path</span>
              <span><i className="legend-dot legend-dot--range" />Range result</span>
              <span><i className="legend-line" />Leaf link</span>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

export default App
