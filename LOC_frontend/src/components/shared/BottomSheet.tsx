import { useEffect } from 'react'

type BottomSheetProps = {
  isOpen: boolean
  onClose: () => void
  ariaLabel: string
  children: React.ReactNode
}

// Hoja inferior compartida — selector de cuenta, sincronía, y los pasos del
// onboarding en mobile la usan todos, ver handoff_loc/05-movil.md.
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

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label={ariaLabel} className="sheet-panel">
        <div className="sheet-grabber" />
        {children}
      </div>
    </>
  )
}
