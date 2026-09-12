// Glifo propio, misma convención que TabGlyph en MobileTabBar.tsx (trazo
// ~1.6px, sin librería de iconos) — indica una pestaña bloqueada hasta que
// exista un pool de campeones.
export function LockGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 22 22" fill="none" aria-hidden>
      <rect x="5" y="10" width="12" height="9" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 10V7a3 3 0 0 1 6 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
