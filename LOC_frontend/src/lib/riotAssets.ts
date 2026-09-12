import { RANK_TIERS } from './constants'

const FALLBACK_DDRAGON_VERSION = '16.17.1'

let cachedVersionPromise: Promise<string> | null = null

export function getDdragonVersion(): Promise<string> {
  if (!cachedVersionPromise) {
    cachedVersionPromise = fetch('https://ddragon.leagueoflegends.com/api/versions.json')
      .then((response) => response.json() as Promise<string[]>)
      .then((versions) => versions[0] ?? FALLBACK_DDRAGON_VERSION)
      .catch(() => FALLBACK_DDRAGON_VERSION)
  }
  return cachedVersionPromise
}

export function getProfileIconUrl(profileIconId: number, version: string) {
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/${profileIconId}.png`
}

export function getRankEmblemUrl(tier: string): string | null {
  const normalized = tier.trim().toUpperCase()
  if (!RANK_TIERS.includes(normalized as (typeof RANK_TIERS)[number])) return null
  return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-${normalized.toLowerCase()}.png`
}

export function getChampionIconUrl(championKey: string, version: string) {
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${championKey}.png`
}

// Splash loading art isn't versioned per-patch like the square icon, so no
// `version` param — used for one-off hero images (lesson media) rather than
// grids, where the bigger file size would add up (see handoff_loc/07-pool-champ.md).
export function getChampionSplashUrl(championKey: string) {
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${championKey}_0.jpg`
}

let cachedChampionListPromise: Promise<string[]> | null = null

export function getChampionList(version: string): Promise<string[]> {
  if (!cachedChampionListPromise) {
    cachedChampionListPromise = fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`)
      .then((response) => response.json() as Promise<{ data: Record<string, { name: string }> }>)
      .then((payload) => Object.values(payload.data).map((champion) => champion.name).sort())
      .catch(() => [])
  }
  return cachedChampionListPromise
}

export function getItemIconUrl(itemId: number, version: string): string | null {
  if (!itemId) return null
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${itemId}.png`
}
