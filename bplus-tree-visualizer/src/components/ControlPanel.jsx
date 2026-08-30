import { useState } from 'react'

function ControlPanel({
  order,
  feedback,
  onInsert,
  onSearch,
  onDelete,
  onRangeSearch,
  onGenerateRandom,
  onOrderChange,
  onReset,
}) {
  const [keyInput, setKeyInput] = useState('')
  const [valueInput, setValueInput] = useState('')
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [localError, setLocalError] = useState('')

  const readKey = () => {
    if (keyInput.trim() === '') {
      setLocalError('Enter a numeric key before choosing an operation.')
      return null
    }

    const key = Number(keyInput)

    if (!Number.isFinite(key)) {
      setLocalError('The key must be a valid finite number.')
      return null
    }

    setLocalError('')
    return key
  }

  const handleInsert = (event) => {
    event.preventDefault()
    const key = readKey()

    if (key === null) {
      return
    }

    onInsert(key, valueInput.trim() || `Record ${key}`)
    setValueInput('')
  }

  const runKeyOperation = (operation) => {
    const key = readKey()

    if (key !== null) {
      operation(key)
    }
  }

  const handleRangeSearch = () => {
    if (rangeStart.trim() === '' || rangeEnd.trim() === '') {
      setLocalError('Enter both a start and end key for the range scan.')
      return
    }

    const startKey = Number(rangeStart)
    const endKey = Number(rangeEnd)

    if (!Number.isFinite(startKey) || !Number.isFinite(endKey)) {
      setLocalError('Range boundaries must be valid finite numbers.')
      return
    }

    if (startKey > endKey) {
      setLocalError('The range start cannot be greater than the range end.')
      return
    }

    setLocalError('')
    onRangeSearch(startKey, endKey)
  }

  const visibleFeedback = localError
    ? {
        type: 'error',
        title: 'Key required',
        message: localError,
      }
    : feedback

  return (
    <section className="control-panel panel-card" aria-labelledby="controls-title">
      <div className="panel-card__header">
        <p className="section-kicker">Operations</p>
        <h2 id="controls-title">Control panel</h2>
      </div>

      <form className="control-form" onSubmit={handleInsert}>
        <label className="field-label" htmlFor="tree-order">
          Tree order
        </label>
        <select
          className="field-control"
          id="tree-order"
          value={order}
          onChange={(event) => onOrderChange(Number(event.target.value))}
        >
          {[3, 4, 5, 6, 7].map((option) => (
            <option key={option} value={option}>
              Order {option}
            </option>
          ))}
        </select>
        <p className="field-help">Changing order starts a new empty tree.</p>

        <label className="field-label" htmlFor="record-key">
          Numeric key
        </label>
        <input
          className="field-control"
          id="record-key"
          inputMode="decimal"
          placeholder="e.g. 42"
          step="any"
          type="number"
          value={keyInput}
          onChange={(event) => setKeyInput(event.target.value)}
        />

        <label className="field-label" htmlFor="record-value">
          Record value <span>optional</span>
        </label>
        <input
          className="field-control"
          id="record-value"
          placeholder="e.g. Customer #42"
          type="text"
          value={valueInput}
          onChange={(event) => setValueInput(event.target.value)}
        />

        <button className="operation-button operation-button--primary" type="submit">
          Insert or update
        </button>

        <div className="operation-grid">
          <button
            className="operation-button"
            type="button"
            onClick={() => runKeyOperation(onSearch)}
          >
            Search
          </button>
          <button
            className="operation-button operation-button--danger"
            type="button"
            onClick={() => runKeyOperation(onDelete)}
          >
            Delete
          </button>
        </div>

        <div className="control-divider" />
        <div className="control-subheading">
          <strong>Range scan</strong>
          <span>inclusive</span>
        </div>
        <div className="range-grid">
          <label>
            <span>From</span>
            <input
              className="field-control"
              inputMode="decimal"
              placeholder="20"
              step="any"
              type="number"
              value={rangeStart}
              onChange={(event) => setRangeStart(event.target.value)}
            />
          </label>
          <label>
            <span>To</span>
            <input
              className="field-control"
              inputMode="decimal"
              placeholder="70"
              step="any"
              type="number"
              value={rangeEnd}
              onChange={(event) => setRangeEnd(event.target.value)}
            />
          </label>
        </div>
        <button
          className="operation-button operation-button--range"
          type="button"
          onClick={handleRangeSearch}
        >
          Scan linked leaves
        </button>
      </form>

      {visibleFeedback && (
        <div
          className={`operation-feedback operation-feedback--${visibleFeedback.type}`}
          role={visibleFeedback.type === 'error' ? 'alert' : 'status'}
          aria-live="polite"
        >
          <strong>{visibleFeedback.title}</strong>
          <span>{visibleFeedback.message}</span>
        </div>
      )}

      <div className="dataset-actions">
        <button type="button" onClick={onGenerateRandom}>
          Generate random dataset
        </button>
        <button type="button" onClick={onReset}>
          Clear tree
        </button>
      </div>
    </section>
  )
}

export default ControlPanel
