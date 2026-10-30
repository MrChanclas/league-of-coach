import type { LocMarkProps } from '../../types/components'

// The header's smaller mark uses thicker strokes so it doesn't thin out at 24px.
const STROKE_WIDTHS = {
  regular: { rail: 7, path: 8 },
  bold: { rail: 8, path: 9 },
} as const

/** Inline brand mark; the same drawing as public/loc-mark.svg. */
export function LocMark({ size, weight = 'regular', className }: LocMarkProps) {
  const strokes = STROKE_WIDTHS[weight]
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" className={className} aria-hidden="true">
      <path d="M13 46 L42 46" stroke="var(--hf-muted-5)" strokeWidth={strokes.rail} strokeLinecap="round" />
      <path d="M68 40 L83 40" stroke="var(--hf-muted-5)" strokeWidth={strokes.rail} strokeLinecap="round" />
      <path
        d="M16 74 C30 72 38 68 44 65 C50 62 52 54 58 42 C62 33 67 26 71 20"
        fill="none"
        stroke="var(--hf-gold-grad-end)"
        strokeWidth={strokes.path}
        strokeLinecap="round"
      />
      <path d="M82 8 L62 16 L72 31 Z" fill="var(--hf-gold-light)" />
    </svg>
  )
}
