import type { ReactElement } from 'react'
import { getChampionSplashUrl } from '../../lib/riotAssets'
import type { LessonCard } from '../../types/dashboard'

type LessonMediaArtProps = {
  mediaType: LessonCard['mediaType']
  kind?: LessonCard['kind']
  championKey?: string
  ddragonVersion: string | null
  label: string
}

const ICON_PROPS = {
  width: 40,
  height: 40,
  viewBox: '0 0 40 40',
  fill: 'none',
  stroke: 'var(--hf-gold-strong)',
  strokeWidth: 2.2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

// One small line-art icon per mediaType, standing in for the real clip /
// heatmap / graph a future analytics pipeline would render — see the old
// metaTemplate field this replaced (removed: it just repeated the mediaType
// as text, which is what the caption under each icon already does).
function GoldGraphIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M6 30 L14 21 L20 26 L34 10" />
      <path d="M26 10 H34 V18" />
      <circle cx="10" cy="33" r="3.2" fill="var(--hf-gold)" stroke="none" opacity="0.9" />
    </svg>
  )
}

function HeatmapIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M20 8 C27 8 32 15 32 21 C32 28 26 32 20 32 C14 32 8 28 8 21 C8 15 13 8 20 8 Z" />
      <circle cx="20" cy="21" r="4.5" fill="var(--hf-gold)" stroke="none" opacity="0.9" />
      <path d="M4 21 H8 M32 21 H36" opacity="0.6" />
    </svg>
  )
}

function ClipIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="6" y="9" width="28" height="22" rx="4" />
      <path d="M17 15 L26 20 L17 25 Z" fill="var(--hf-gold)" stroke="none" />
    </svg>
  )
}

function MatchupIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M8 8 L20 20 M20 20 L14 32 M20 20 L26 32" />
      <path d="M32 8 L20 20" />
      <circle cx="20" cy="20" r="2.6" fill="var(--hf-gold)" stroke="none" />
    </svg>
  )
}

function SessionReportIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M5 22 H12 L16 12 L22 30 L26 20 L29 24 H35" />
    </svg>
  )
}

const MEDIA_ICONS: Record<LessonCard['mediaType'], () => ReactElement> = {
  GOLD_GRAPH: GoldGraphIcon,
  HEATMAP: HeatmapIcon,
  CLIP: ClipIcon,
  MATCHUP_TABLE: MatchupIcon,
  SESSION_REPORT: SessionReportIcon,
}

/**
 * Replaces the old plain-text placeholder in .lesson-media: a champion
 * lesson gets the real splash art (genuinely tied to that lesson), everything
 * else gets a small themed line-art icon instead of a bare label — see
 * handoff to the user: no image-generation tool available, and reusing real
 * meme images would be a rights/curation problem, so this is the coded
 * alternative rather than a placeholder.
 */
export function LessonMediaArt({ mediaType, kind, championKey, ddragonVersion, label }: LessonMediaArtProps) {
  if (kind === 'champion' && championKey && ddragonVersion) {
    return (
      <div className="lesson-media lesson-media--champion">
        <img src={getChampionSplashUrl(championKey)} alt={championKey} />
        <div className="lesson-media-champion-fade" />
        <span className="lesson-media-champion-label">{championKey}</span>
      </div>
    )
  }

  const Icon = MEDIA_ICONS[mediaType]
  return (
    <div className="lesson-media">
      <Icon />
      <span>{label}</span>
    </div>
  )
}
