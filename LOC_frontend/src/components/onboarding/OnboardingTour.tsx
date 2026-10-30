import { useEffect, useRef, useState } from 'react'
import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom'
import { COACH_STEPS, DONE_STEP, LAST_COACH_STEP, WELCOME_STEPS } from '../../constants'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { LocMark } from '../shared/LocMark'
import type { OnboardingTourProps, TooltipPosition } from '../../types/components'

// El mismo data-tour puede existir dos veces a la vez (sidebar de escritorio
// + MobileTabBar, o el botón de sincronía de escritorio + el compacto de
// mobile): uno queda oculto por CSS según el ancho de pantalla. Nos quedamos
// con el primero que realmente tiene tamaño en el viewport.
function findVisibleAnchor(selector: string): HTMLElement | null {
  const candidates = document.querySelectorAll<HTMLElement>(selector)
  for (const candidate of candidates) {
    const rect = candidate.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) return candidate
  }
  return null
}

function BrandLockup() {
  return (
    <div className="onboard-brand">
      <LocMark size={30} className="onboard-brand-mark" />
      <div>
        <div className="onboard-brand-eyebrow">LEAGUE OF COACHING</div>
        <div className="onboard-brand-name">LoC</div>
      </div>
    </div>
  )
}

export function OnboardingTour({ onClose, onLoadMatches }: OnboardingTourProps) {
  const [step, setStep] = useState(0)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [holeRect, setHoleRect] = useState<DOMRect | null>(null)
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition | null>(null)
  const [isAnchorMissing, setIsAnchorMissing] = useState(false)
  // Debajo de 640px el tooltip flotante se vuelve una hoja fija al fondo
  // (ver handoff_loc/05-movil.md) en vez de perseguir el ancla real, que
  // muchas veces ni siquiera está en el viewport en una pantalla angosta.
  const isMobile = useMediaQuery('(max-width: 639.98px)')

  const isWelcome = step === 0
  const isDone = step === DONE_STEP
  const isCoach = step >= 1 && step <= LAST_COACH_STEP
  const coach = isCoach ? COACH_STEPS[step - 1] : null
  const tooltipNote = isAnchorMissing && coach?.missingAnchorNote ? coach.missingAnchorNote : coach?.note

  const next = () => setStep((current) => Math.min(DONE_STEP, current + 1))
  const prev = () => setStep((current) => Math.max(0, current - 1))
  const skipToDone = () => setStep(DONE_STEP)

  // Posiciona el hueco del spotlight y el tooltip contra el elemento real
  // (data-tour). Si todavía no existe porque el usuario avanzó el recorrido
  // sin hacer la acción real (p. ej. el panel de la cuenta antes de registrar
  // una), el tooltip queda centrado en pantalla, sin hueco. Anclarlo al
  // contenido principal lo dejaba fuera del viewport — ese contenedor es más
  // alto que la pantalla — y solo se veía el fondo oscuro, sin botones.
  useEffect(() => {
    // Nada que posicionar en el modal de bienvenida/cierre — y si se vuelve
    // a un paso coach después, este efecto corre de nuevo con un `coach`
    // real y recalcula desde cero, así que no hace falta "limpiar" acá.
    if (!coach) return

    const floating = tooltipRef.current
    const realAnchor = findVisibleAnchor(coach.anchorSelector)
    if (!floating) return

    if (!realAnchor) {
      const frame = requestAnimationFrame(() => {
        setHoleRect(null)
        setIsAnchorMissing(true)
        floating.focus({ preventScroll: true })
      })
      return () => cancelAnimationFrame(frame)
    }

    const anchor = realAnchor
    const update = () => {
      setIsAnchorMissing(false)
      setHoleRect(anchor.getBoundingClientRect())

      // En mobile el tooltip vive fijo al fondo (ver CSS .onboard-tooltip--sheet):
      // solo hace falta el hueco del spotlight, no una posición flotante.
      if (isMobile) {
        floating.focus({ preventScroll: true })
        return
      }

      void computePosition(anchor, floating, {
        placement: coach.placement,
        middleware: [offset(24), flip(), shift({ padding: 12 })],
      }).then(({ x, y }) => {
        setTooltipPos({ x, y })
        floating.focus({ preventScroll: true })
      })
    }

    return autoUpdate(anchor, floating, update)
  }, [coach, isMobile])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (!isCoach) return
      if (event.key === 'ArrowRight' || event.key === 'Enter') {
        event.preventDefault()
        next()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        prev()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isCoach, onClose])

  return (
    <>
      {isCoach && (
        <>
          {holeRect ? (
            <div
              aria-hidden
              className="onboard-spotlight-hole"
              style={{
                top: holeRect.top - 7,
                left: holeRect.left - 7,
                width: holeRect.width + 14,
                height: holeRect.height + 14,
              }}
            />
          ) : (
            <div aria-hidden className="onboard-backdrop" />
          )}

          <div
            ref={tooltipRef}
            role="dialog"
            aria-modal="true"
            aria-live="polite"
            aria-label={coach?.title}
            tabIndex={-1}
            className={
              isMobile
                ? 'onboard-tooltip onboard-tooltip--sheet'
                : isAnchorMissing
                  ? 'onboard-tooltip onboard-tooltip--centered'
                  : 'onboard-tooltip'
            }
            style={
              isMobile || isAnchorMissing
                ? undefined
                : {
                    top: tooltipPos?.y ?? 0,
                    left: tooltipPos?.x ?? 0,
                    visibility: tooltipPos ? 'visible' : 'hidden',
                  }
            }
          >
            <div className="onboard-tooltip-head">
              <span className="onboard-tooltip-tag">{coach?.tag}</span>
              <span className="onboard-tooltip-counter">{step} / {LAST_COACH_STEP}</span>
            </div>
            <div className="onboard-tooltip-title">{coach?.title}</div>
            <div className="onboard-tooltip-body">{coach?.body}</div>
            {tooltipNote && (
              <div className="onboard-tooltip-note">
                <span className="onboard-note-dot" />
                <span>{tooltipNote}</span>
              </div>
            )}
            <div className="onboard-progress">
              {COACH_STEPS.map((item, index) => (
                <span
                  key={item.anchorSelector}
                  className={index <= step - 1 ? 'onboard-progress-seg done' : 'onboard-progress-seg'}
                />
              ))}
            </div>
            <div className="onboard-tooltip-actions">
              <button type="button" className="onboard-btn-secondary" onClick={prev} disabled={step === 1}>
                Atrás
              </button>
              <button type="button" className="primary-btn onboard-btn-next" onClick={next}>
                {step === LAST_COACH_STEP ? 'Terminar' : 'Siguiente'}
              </button>
              <button type="button" className="onboard-skip" onClick={onClose}>
                Saltar
              </button>
            </div>
          </div>
        </>
      )}

      {isWelcome && (
        <>
          <div aria-hidden className="onboard-backdrop" onClick={onClose} />
          <div role="dialog" aria-modal="true" aria-label="Bienvenida a League of Coaching" className="onboard-modal onboard-modal--welcome">
            <BrandLockup />
            <h2 className="onboard-modal-title">Cuatro minutos y tu panel queda armado</h2>
            <p className="onboard-modal-body">
              LoC no te tira cien estadísticas. Lee tus partidas y te devuelve tres cosas concretas para arreglar
              esta semana, más objetivos que sabes si vas a cumplir o no.
            </p>
            <div className="onboard-welcome-steps">
              {WELCOME_STEPS.map((item) => (
                <div key={item.n} className="onboard-welcome-step">
                  <div className="onboard-welcome-step-num">{item.n}</div>
                  <div>
                    <div className="onboard-welcome-step-title">{item.title}</div>
                    <div className="onboard-welcome-step-body">{item.body}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="onboard-modal-actions">
              <button type="button" className="primary-btn onboard-modal-cta" onClick={next}>
                Empezar el recorrido
              </button>
              <button type="button" className="onboard-modal-ghost" onClick={skipToDone}>
                Lo miro solo
              </button>
            </div>
          </div>
        </>
      )}

      {isDone && (
        <>
          <div aria-hidden className="onboard-backdrop" onClick={onClose} />
          <div role="dialog" aria-modal="true" aria-label="Recorrido completo" className="onboard-modal onboard-modal--done">
            <div className="onboard-tooltip-tag">RECORRIDO COMPLETO</div>
            <h2 className="onboard-modal-title onboard-modal-title--done">Ya sabes dónde está todo</h2>
            <p className="onboard-modal-body">
              Lo único que le falta a tu panel son partidas. Carga una sesión y el análisis se actualiza solo:
              winrate, tendencias, lecciones y el ritmo de tus objetivos.
            </p>
            <div className="onboard-done-note">
              <div className="onboard-done-note-title">Puedes volver a ver esto cuando quieras</div>
              <div className="onboard-done-note-body">
                Está en tu menú de usuario, abajo a la izquierda, en «Ver el recorrido».
              </div>
            </div>
            <div className="onboard-modal-actions onboard-modal-actions--done">
              <button
                type="button"
                className="primary-btn onboard-modal-cta"
                onClick={() => {
                  onLoadMatches()
                  onClose()
                }}
              >
                Cargar mis partidas
              </button>
              <button type="button" className="onboard-btn-secondary" onClick={onClose}>
                Ir al panel
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
