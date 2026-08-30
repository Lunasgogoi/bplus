function OperationHistory({ entries }) {
  return (
    <section className="history-panel panel-card" aria-labelledby="history-title">
      <div className="panel-card__header panel-card__header--inline">
        <div>
          <p className="section-kicker">Session</p>
          <h2 id="history-title">Recent operations</h2>
        </div>
        <span className="history-count">{entries.length}</span>
      </div>

      {entries.length === 0 ? (
        <p className="history-empty">No operations yet.</p>
      ) : (
        <ol className="history-list">
          {entries.map((entry) => (
            <li key={entry.id}>
              <span className={`history-icon history-icon--${entry.type}`} aria-hidden="true" />
              <div>
                <strong>{entry.title}</strong>
                <span>{entry.detail}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

export default OperationHistory
