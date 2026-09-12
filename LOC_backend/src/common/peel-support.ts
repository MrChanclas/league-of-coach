import { RiotMatchTimelineDto } from '../riot/riot-api.service';

/**
 * Champions built around shielding/healing/kiting for an ally rather than
 * initiating fights — Riot has no official "peel" tag, so this is a manually
 * curated list of the classic enchanter/protect supports the "No más
 * escudos" lesson (see lessons-knowledge-base.json) is meant to apply to.
 * Not exhaustive by design: a borderline pick left out here just means that
 * champion never triggers the lesson, which is the safe failure mode.
 */
export const PEEL_SUPPORT_CHAMPIONS = [
  'Janna',
  'Lulu',
  'Milio',
  'Nami',
  'Sona',
  'Soraka',
  'Yuumi',
  'Karma',
  'Braum',
  'Taric',
  'Zilean',
  'Seraphine',
];

// Deaths after this point are treated as normal mid/late-game roaming rather
// than "left bot lane to go ward" — the scenario the lesson is about.
export const PEEL_TRACKING_CUTOFF_MS = 20 * 60 * 1000;

// Roughly the radius a support can realistically react within (flash range,
// a couple of ability casts) — beyond this they had no real chance to peel.
// Frame snapshots are ~60s apart, so this is an approximation, not a precise
// reconstruction of the fight.
const PEEL_RANGE_UNITS = 2000;

function distance(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export type PeelIncidentCounts = {
  tracked: number;
  unguarded: number;
};

/**
 * Counts early-game deaths of `adcParticipantId` and, for each one, whether
 * `supportParticipantId` was within peel range at the closest available
 * frame snapshot. Timeline frames land roughly every 60s, so the position
 * used can be up to that far removed from the actual death — the best
 * granularity Riot's timeline exposes.
 */
export function computePeelIncidents(
  timeline: RiotMatchTimelineDto,
  supportParticipantId: number,
  adcParticipantId: number,
): PeelIncidentCounts {
  let tracked = 0;
  let unguarded = 0;

  for (const frame of timeline.info.frames) {
    const supportPosition =
      frame.participantFrames[String(supportParticipantId)]?.position;

    for (const event of frame.events) {
      if (
        event.type !== 'CHAMPION_KILL' ||
        event.victimId !== adcParticipantId ||
        event.timestamp > PEEL_TRACKING_CUTOFF_MS ||
        !event.position ||
        !supportPosition
      ) {
        continue;
      }

      tracked += 1;
      if (distance(supportPosition, event.position) > PEEL_RANGE_UNITS) {
        unguarded += 1;
      }
    }
  }

  return { tracked, unguarded };
}
