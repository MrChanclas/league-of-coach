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

const RANKED_TIERS = [
  'IRON',
  'BRONZE',
  'SILVER',
  'GOLD',
  'PLATINUM',
  'EMERALD',
  'DIAMOND',
  'MASTER',
  'GRANDMASTER',
  'CHALLENGER',
]

export function getRankEmblemUrl(tier: string): string | null {
  const normalized = tier.trim().toUpperCase()
  if (!RANKED_TIERS.includes(normalized)) return null
  return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-${normalized.toLowerCase()}.png`
}

export function getChampionIconUrl(championKey: string, version: string) {
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${championKey}.png`
}

export function getItemIconUrl(itemId: number, version: string): string | null {
  if (!itemId) return null
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${itemId}.png`
}
