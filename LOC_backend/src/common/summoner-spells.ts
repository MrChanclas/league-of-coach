import { RiotMatchParticipantDto } from '../riot/riot-api.service';

// Riot's static summoner spell id for Teleport (SummonerTeleport.json).
export const TELEPORT_SUMMONER_SPELL_ID = 12;

/**
 * Riot's match participant object reports how many times each equipped
 * summoner spell was cast (summonerXCasts) alongside its id (summonerXId) —
 * an exact count, no timeline heuristics needed. Returns null when this
 * participant didn't take Teleport at all, so callers can tell "didn't
 * bring it" apart from "brought it and never cast it".
 */
export function getTeleportCasts(
  participant: RiotMatchParticipantDto,
): number | null {
  if (participant.summoner1Id === TELEPORT_SUMMONER_SPELL_ID) {
    return participant.summoner1Casts;
  }
  if (participant.summoner2Id === TELEPORT_SUMMONER_SPELL_ID) {
    return participant.summoner2Casts;
  }
  return null;
}
