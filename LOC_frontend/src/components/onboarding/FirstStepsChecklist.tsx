import { CHECKLIST_TASKS } from './onboardingCopy'

type FirstStepsChecklistProps = {
  // Una entrada por tarea, en el mismo orden que CHECKLIST_TASKS — reflejan
  // estado real (¿tiene cuentas? ¿tiene partidas? ...), no el paso del tour.
  completed: boolean[]
  // 'floating' (por defecto) = widget fijo abajo a la derecha, para escritorio.
  // 'inline' = bloque de ancho completo dentro del scroll de la vista Cuentas
  // en mobile — ver handoff_loc/05-movil.md.
  variant?: 'floating' | 'inline'
}

export function FirstStepsChecklist({ completed, variant = 'floating' }: FirstStepsChecklistProps) {
  const doneCount = completed.filter(Boolean).length
  if (doneCount >= CHECKLIST_TASKS.length) return null

  // La tarea "actual" es la primera pendiente — solo ella muestra su ayuda.
  const activeIndex = completed.findIndex((done) => !done)
  const donePct = Math.round((doneCount / CHECKLIST_TASKS.length) * 100)
  const className = variant === 'inline' ? 'onboard-checklist onboard-checklist--inline' : 'onboard-checklist'

  return (
    <div className={className} role="complementary" aria-label="Primeros pasos">
      <div className="onboard-checklist-head">
        <div className="onboard-checklist-head-row">
          <span className="onboard-checklist-label">PRIMEROS PASOS</span>
          <span className="onboard-checklist-count">
            {doneCount} / {CHECKLIST_TASKS.length}
          </span>
        </div>
        <div className="onboard-checklist-bar-track">
          <div className="onboard-checklist-bar-fill" style={{ width: `${donePct}%` }} />
        </div>
      </div>

      <div className="onboard-checklist-tasks">
        {CHECKLIST_TASKS.map((task, index) => {
          const done = completed[index]
          const isNow = index === activeIndex
          const rowClass = isNow ? 'onboard-task-row onboard-task-row--now' : 'onboard-task-row'
          const boxClass = done
            ? 'onboard-task-box onboard-task-box--done'
            : isNow
              ? 'onboard-task-box onboard-task-box--now'
              : 'onboard-task-box'
          const labelClass = done
            ? 'onboard-task-label onboard-task-label--done'
            : isNow
              ? 'onboard-task-label onboard-task-label--now'
              : 'onboard-task-label'

          return (
            <div key={task.name} className={rowClass}>
              <div className={boxClass}>{done ? '✓' : index + 1}</div>
              <div className="onboard-task-text">
                <div className={labelClass}>{task.name}</div>
                {isNow && <div className="onboard-task-hint">{task.hint}</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
