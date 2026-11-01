import { Modal } from '../shared/Modal'
import { ROLE_KEYS, ROLE_LABELS, ROLE_METRIC_LABELS } from '../../constants'
import type { RoleMetricsInfoModalProps } from '../../types/components'

export function RoleMetricsInfoModal({ isOpen, onClose }: RoleMetricsInfoModalProps) {
  if (!isOpen) return null

  return (
    <Modal title="¿Qué datos miden por rol?" onClose={onClose}>

        {ROLE_KEYS.map((role) => (
          <div key={role} style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>{ROLE_LABELS[role]}</div>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {ROLE_METRIC_LABELS[role].map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          </div>
        ))}
    </Modal>
  )
}
