import { useState } from 'react'
import type { SubmitEvent } from 'react'
import {
  AVAILABILITY_LABELS,
  AVAILABILITY_SLOTS,
  DUO_NOTE_MAX,
  DUO_QUEUE_LABELS,
  ROLE_KEYS,
  ROLE_LABELS,
} from '../../constants'
import { AccountVerificationModal } from '../accounts/AccountVerificationModal'
import { toggleValue } from '../../lib/social'
import type { DuoProfileFormProps, RolePickerProps } from '../../types/components'
import type { AvailabilitySlot, DuoQueue } from '../../types/social'

const QUEUES: DuoQueue[] = ['solo', 'flex']

/** The player's "looking for duo" card: who they are and who they want. */
export function DuoProfileForm({ profile, userAccounts, ddragonVersion, defaultAccountId, isSaving, onSave }: DuoProfileFormProps) {
  const [accountId, setAccountId] = useState(profile?.accountId ?? defaultAccountId ?? '')
  const [queue, setQueue] = useState<DuoQueue>(profile?.queue ?? 'solo')
  const [roles, setRoles] = useState<string[]>(profile?.roles ?? [])
  const [lookingFor, setLookingFor] = useState<string[]>(profile?.lookingFor ?? [])
  const [availability, setAvailability] = useState<AvailabilitySlot[]>(profile?.availability ?? [])
  const [note, setNote] = useState(profile?.note ?? '')

  const [isVerifying, setIsVerifying] = useState(false)

  const selectedAccount = userAccounts.find((account) => account.id === accountId)
  const needsVerification = Boolean(selectedAccount && !selectedAccount.verifiedAt)
  const isActive = profile?.active ?? false
  const canSave = Boolean(accountId) && roles.length > 0 && lookingFor.length > 0

  const save = (active: boolean) =>
    onSave({ accountId, queue, roles, lookingFor, availability, note: note.trim() || undefined, active })

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    save(true)
  }

  return (
    <form className="social-card duo-profile-form" onSubmit={handleSubmit}>
      <div className="social-card-head">
        <div>
          <div className="social-card-eyebrow">TU PERFIL DE DUO</div>
          <h2>{isActive ? 'Estás buscando duo' : 'Busca un duo'}</h2>
        </div>
        {isActive && <span className="duo-status-badge">VISIBLE</span>}
      </div>

      <label className="duo-field">
        <span className="duo-field-label">Cuenta</span>
        <select value={accountId} onChange={(event) => setAccountId(event.target.value)}>
          {userAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.summoner} #{account.tag} · {account.server}
            </option>
          ))}
        </select>
      </label>

      <div className="duo-field">
        <span className="duo-field-label">Cola</span>
        <div className="time-toggle">
          {QUEUES.map((option) => (
            <button
              key={option}
              type="button"
              className={queue === option ? 'time-toggle-btn active' : 'time-toggle-btn'}
              onClick={() => setQueue(option)}
            >
              {DUO_QUEUE_LABELS[option]}
            </button>
          ))}
        </div>
      </div>

      <RolePicker label="Juego de" selected={roles} onToggle={(role) => setRoles(toggleValue(roles, role))} />
      <RolePicker
        label="Busco a alguien de"
        selected={lookingFor}
        onToggle={(role) => setLookingFor(toggleValue(lookingFor, role))}
      />

      <div className="duo-field">
        <span className="duo-field-label">Horario</span>
        <div className="duo-pills">
          {AVAILABILITY_SLOTS.map((slot) => (
            <button
              key={slot}
              type="button"
              className={availability.includes(slot) ? 'filter-pill active' : 'filter-pill'}
              onClick={() => setAvailability(toggleValue(availability, slot))}
            >
              {AVAILABILITY_LABELS[slot]}
            </button>
          ))}
        </div>
      </div>

      <label className="duo-field">
        <span className="duo-field-label">Nota (opcional)</span>
        <textarea
          value={note}
          maxLength={DUO_NOTE_MAX}
          rows={2}
          placeholder="Ej.: juego con micrófono, busco subir a Diamante esta temporada."
          onChange={(event) => setNote(event.target.value)}
        />
      </label>

      {needsVerification && (
        <div className="duo-verify-notice" role="status">
          <p>Para buscar duo, primero confirma que esta cuenta de Riot es tuya. Así nadie puede hacerse pasar por otro jugador.</p>
          <button type="button" className="secondary-btn" onClick={() => setIsVerifying(true)}>
            Verificar cuenta
          </button>
        </div>
      )}

      <div className="duo-form-actions">
        <button type="submit" className="primary-btn" disabled={!canSave || isSaving || needsVerification}>
          {isActive ? 'Guardar cambios' : 'Empezar a buscar'}
        </button>
        {isActive && (
          <button type="button" className="secondary-btn" disabled={isSaving} onClick={() => save(false)}>
            Dejar de buscar
          </button>
        )}
      </div>

      {isVerifying && selectedAccount && (
        <AccountVerificationModal
          target={{ summoner: selectedAccount.summoner, tag: selectedAccount.tag, server: selectedAccount.server }}
          ddragonVersion={ddragonVersion}
          onClose={() => setIsVerifying(false)}
        />
      )}
    </form>
  )
}

function RolePicker({ label, selected, onToggle }: RolePickerProps) {
  return (
    <div className="duo-field">
      <span className="duo-field-label">{label}</span>
      <div className="duo-pills">
        {ROLE_KEYS.map((role) => (
          <button
            key={role}
            type="button"
            className={selected.includes(role) ? 'filter-pill active' : 'filter-pill'}
            onClick={() => onToggle(role)}
          >
            {ROLE_LABELS[role]}
          </button>
        ))}
      </div>
    </div>
  )
}
