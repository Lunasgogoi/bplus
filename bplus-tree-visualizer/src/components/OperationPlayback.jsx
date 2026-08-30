function OperationPlayback({
  events,
  currentIndex,
  isPlaying,
  onPrevious,
  onTogglePlayback,
  onNext,
  onSelectStep,
}) {
  const currentEvent = events[currentIndex]

  if (!currentEvent) {
    return (
      <section className="playback playback--empty" aria-label="Operation playback">
        Run an operation to see its algorithm steps here.
      </section>
    )
  }

  const isFirst = currentIndex === 0
  const isLast = currentIndex === events.length - 1

  return (
    <section className="playback" aria-labelledby="playback-title">
      <div className="playback__copy" aria-live="polite">
        <div className="playback__meta">
          <span>Step {currentIndex + 1} of {events.length}</span>
          <span className={`event-badge event-badge--${currentEvent.type}`}>
            {currentEvent.type.replaceAll('-', ' ')}
          </span>
        </div>
        <h3 id="playback-title">{currentEvent.title}</h3>
        <p>{currentEvent.message}</p>
      </div>

      <div className="playback__actions" aria-label="Playback controls">
        <button
          type="button"
          aria-label="Previous step"
          disabled={isFirst}
          onClick={onPrevious}
        >
          <span aria-hidden="true">←</span>
        </button>
        <button
          className="playback__toggle"
          type="button"
          aria-label={isPlaying ? 'Pause playback' : 'Play operation steps'}
          disabled={events.length < 2}
          onClick={onTogglePlayback}
        >
          {isPlaying ? 'Pause' : isLast ? 'Replay' : 'Play'}
        </button>
        <button
          type="button"
          aria-label="Next step"
          disabled={isLast}
          onClick={onNext}
        >
          <span aria-hidden="true">→</span>
        </button>
      </div>

      <div className="playback__timeline" aria-label="Operation steps">
        {events.map((event, index) => (
          <button
            className={
              index === currentIndex
                ? 'playback__step playback__step--active'
                : index < currentIndex
                  ? 'playback__step playback__step--complete'
                  : 'playback__step'
            }
            type="button"
            key={event.id}
            aria-label={`Go to step ${index + 1}: ${event.title}`}
            aria-current={index === currentIndex ? 'step' : undefined}
            onClick={() => onSelectStep(index)}
          />
        ))}
      </div>
    </section>
  )
}

export default OperationPlayback
