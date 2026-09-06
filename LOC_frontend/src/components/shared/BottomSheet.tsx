import { useEffect } from 'react'
import { createPortal } from 'react-dom'

type BottomSheetProps = {
  isOpen: boolean
  onClose: () => void
  ariaLabel: string
  children: React.ReactNode
}

// Hoja inferior compartida — selector de cuenta, sincronía, y los pasos del
// onboarding en mobile la usan todos, ver handoff_loc/05-movil.md.
//
// Se monta con un portal directo a document.body: si viviera dentro del
// header (que tiene position:sticky + z-index, y por lo tanto crea su propio
// contexto de apilamiento), su z-index solo competiría contra otros hijos
// del header — hacia afuera quedaría atrapada detrás de cualquier otro
// elemento con z-index más alto en otra rama del árbol (por ejemplo la barra
// de pestañas inferior), tapando parte de la hoja o desviando el toque.
export function BottomSheet({ isOpen, onClose, ariaLabel, children }: BottomSheetProps) {
  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return createPortal(
    <>
      <div className="sheet-backdrop" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label={ariaLabel} className="sheet-panel">
        <div className="sheet-grabber" />
        {children}
      </div>
    </>,
    document.body,
  )
}
