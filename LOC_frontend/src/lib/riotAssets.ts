import { RANK_TIERS } from './constants'

// Un solo lugar para los hosts de arte de Riot: Data Dragon sirve los assets
// versionados por parche y Community Dragon los emblemas de rango, que no
// están versionados.
const DDRAGON_HOST = 'https://ddragon.leagueoflegends.com'
const RANK_EMBLEM_BASE =
  'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem'

// Solo se usa si Data Dragon no responde. Mantener igual a FALLBACK_VERSION
// en el backend (LOC_backend/src/champion-guides/data-dragon.service.ts):
// son paquetes separados y no pueden compartir la constante.
const FALLBACK_DDRAGON_VERSION = '16.18.1'

/** Base del CDN para un parche concreto: de aquí cuelgan íconos, ítems y datos. */
const cdn = (version: string) => `${DDRAGON_HOST}/cdn/${version}`

let cachedVersionPromise: Promise<string> | null = null

export function getDdragonVersion(): Promise<string> {
  if (!cachedVersionPromise) {
    cachedVersionPromise = fetch(`${DDRAGON_HOST}/api/versions.json`)
      .then((response) => response.json() as Promise<string[]>)
      .then((versions) => versions[0] ?? FALLBACK_DDRAGON_VERSION)
      .catch(() => FALLBACK_DDRAGON_VERSION)
  }
  return cachedVersionPromise
}

export function getProfileIconUrl(profileIconId: number, version: string) {
  return `${cdn(version)}/img/profileicon/${profileIconId}.png`
}

export function getRankEmblemUrl(tier: string): string | null {
  const normalized = tier.trim().toUpperCase()
  if (!RANK_TIERS.includes(normalized as (typeof RANK_TIERS)[number])) return null
  return `${RANK_EMBLEM_BASE}/emblem-${normalized.toLowerCase()}.png`
}

export function getChampionIconUrl(championKey: string, version: string) {
  return `${cdn(version)}/img/champion/${championKey}.png`
}

// Splash loading art isn't versioned per-patch like the square icon, so no
// `version` param — used for one-off hero images (lesson media) rather than
// grids, where the bigger file size would add up (see handoff_loc/07-pool-champ.md).
export function getChampionSplashUrl(championKey: string) {
  return `${DDRAGON_HOST}/cdn/img/champion/loading/${championKey}_0.jpg`
}

// Indexada por versión: la lista cambia de un parche a otro, así que una sola
// caché global devolvería campeones del parche anterior tras una actualización.
const championListByVersion = new Map<string, Promise<string[]>>()

export function getChampionList(version: string): Promise<string[]> {
  const cached = championListByVersion.get(version)
  if (cached) return cached

  const request = fetch(`${cdn(version)}/data/en_US/champion.json`)
    .then((response) => response.json() as Promise<{ data: Record<string, { name: string }> }>)
    .then((payload) => Object.values(payload.data).map((champion) => champion.name).sort())
    .catch(() => [])
  championListByVersion.set(version, request)
  return request
}

export function getItemIconUrl(itemId: number, version: string): string | null {
  if (!itemId) return null
  return `${cdn(version)}/img/item/${itemId}.png`
}
