import { ROLE_LABELS } from '../../lib/goalLabels'
import { ROLE_METRIC_LABELS } from '../../lib/roleMetricsInfo'

type RoleMetricsInfoModalProps = {
  isOpen: boolean
  onClose: () => void
}

const ROLE_ORDER = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY']

export function RoleMetricsInfoModal({ isOpen, onClose }: RoleMetricsInfoModalProps) {
  if (!isOpen) return null

  const handleBackdropClick = (event: React.MouseEvent) => {
    // Nested inside GoalFormModal's own backdrop, so a click here must not
    // bubble up and close the form behind it too.
    event.stopPropagation()
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>¿Qué datos miden por rol?</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>

        {ROLE_ORDER.map((role) => (
          <div key={role} style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>{ROLE_LABELS[role]}</div>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {ROLE_METRIC_LABELS[role].map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
