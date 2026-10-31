export type CoachStep = {
  anchorSelector: string
  tag: string
  title: string
  body: string
  note: string | null
  missingAnchorNote?: string
  placement: 'right-start' | 'bottom-start' | 'bottom-end'
}
