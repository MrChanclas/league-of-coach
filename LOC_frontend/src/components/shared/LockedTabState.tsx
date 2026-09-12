import { LockGlyph } from './LockGlyph'

type LockedTabStateProps = {
  title: string
  body: string
  ctaLabel: string
  onCtaClick: () => void
}

/** In-panel placeholder for a tab locked until the account has a champion pool. */
export function LockedTabState({ title, body, ctaLabel, onCtaClick }: LockedTabStateProps) {
  return (
    <div className="view-content">
      <div className="locked-tab-state">
        <LockGlyph className="locked-tab-state-icon" />
        <h1>{title}</h1>
        <p>{body}</p>
        <button type="button" className="primary-btn" onClick={onCtaClick}>
          {ctaLabel}
        </button>
      </div>
    </div>
  )
}
