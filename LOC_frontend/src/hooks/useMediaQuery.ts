import { useSyncExternalStore } from 'react'

// Se usa para reordenar contenido entre el layout de escritorio (columnas
// independientes) y el de mobile (una sola columna) — ver handoff_loc/05-movil.md.
function subscribe(query: string, onChange: () => void) {
  const mediaQueryList = window.matchMedia(query)
  mediaQueryList.addEventListener('change', onChange)
  return () => mediaQueryList.removeEventListener('change', onChange)
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => subscribe(query, onChange),
    () => window.matchMedia(query).matches,
  )
}
