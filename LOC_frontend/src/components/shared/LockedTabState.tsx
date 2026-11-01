import { LockGlyph } from './LockGlyph'
import type { LockedTabStateProps } from '../../types/components'

/** In-panel placeholder for a tab locked until the account meets a requirement (verified, has a champion pool). */
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
