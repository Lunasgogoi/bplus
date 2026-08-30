function StatisticsPanel({ stats }) {
  const keyRange =
    stats.minKey === undefined ? 'Empty' : `${stats.minKey} – ${stats.maxKey}`

  return (
    <section className="statistics-panel panel-card" aria-labelledby="stats-title">
      <div className="panel-card__header panel-card__header--inline">
        <div>
          <p className="section-kicker">Live metrics</p>
          <h2 id="stats-title">Tree statistics</h2>
        </div>
        <span className="stats-order">m = {stats.order}</span>
      </div>

      <dl className="stats-grid">
        <div>
          <dt>Records</dt>
          <dd>{stats.recordCount}</dd>
        </div>
        <div>
          <dt>Height</dt>
          <dd>{stats.height}</dd>
        </div>
        <div>
          <dt>All nodes</dt>
          <dd>{stats.nodeCount}</dd>
        </div>
        <div>
          <dt>Leaf nodes</dt>
          <dd>{stats.leafNodeCount}</dd>
        </div>
      </dl>

      <div className="capacity-meter">
        <div className="capacity-meter__label">
          <span>Leaf utilization</span>
          <strong>{stats.leafUtilization}%</strong>
        </div>
        <div
          className="capacity-meter__track"
          role="meter"
          aria-label="Leaf utilization"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={stats.leafUtilization}
        >
          <span style={{ width: `${stats.leafUtilization}%` }} />
        </div>
      </div>

      <div className="key-range">
        <span>Key range</span>
        <strong>{keyRange}</strong>
      </div>
    </section>
  )
}

export default StatisticsPanel
