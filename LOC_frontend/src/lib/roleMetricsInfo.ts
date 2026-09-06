// Mirrors the metric labels defined per role in the backend
// (LOC_backend/src/common/role-performance.ts ROLE_METRICS) — display-only,
// intentionally without weights or benchmark formulas (those stay internal).
export const ROLE_METRIC_LABELS: Record<string, string[]> = {
  TOP: ['Solo Kills / Muertes', 'Ventaja de nivel vs. rival de línea', 'Torres botadas'],
  JUNGLE: ['Participación en kills', 'Participación en objetivos', 'Ventaja de CS en la jungla vs. jungla rival'],
  MIDDLE: ['Ventaja de CS vs. rival de línea', 'Participación en kills', '% de daño del equipo'],
  BOTTOM: ['CS/min', '% de daño del equipo', 'Muertes promedio'],
  UTILITY: ['Participación en kills', 'Visión/min', 'Control wards/min'],
}
