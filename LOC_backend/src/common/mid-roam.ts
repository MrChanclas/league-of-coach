import { RiotMatchTimelineDto } from '../riot/riot-api.service';

/**
 * Summoner's Rift's two bases sit at opposite corners along the x=y
 * diagonal, and mid lane runs straight between them — so how far a point
 * strays from that diagonal is a decent stand-in for "how far outside mid
 * lane this champion currently is" (into river, a side lane, or the
 * jungle), without needing to hand-draw lane polygons.
 */
const MID_CORRIDOR_HALF_WIDTH_UNITS = 3000;

// Rotations after this point blend into normal full-team grouping, where
// "does mid leave lane" stops being a distinct skill worth grading.
export const MID_ROAM_TRACKING_CUTOFF_MS = 25 * 60 * 1000;

export type MidRoamFrameCounts = {
  tracked: number;
  away: number;
};

/**
 * Counts how many early-game timeline frames had the midlaner positioned
 * away from the mid lane corridor — a rotation to help another lane, ward
 * river, or contest a jungle camp, whether or not it produced a kill,
 * assist, or objective takedown. Frame snapshots are ~60s apart, so this is
 * a coarse presence check, not a full path reconstruction.
 */
export function computeMidRoamFrames(
  timeline: RiotMatchTimelineDto,
  midParticipantId: number,
): MidRoamFrameCounts {
  let tracked = 0;
  let away = 0;

  for (const frame of timeline.info.frames) {
    if (frame.timestamp > MID_ROAM_TRACKING_CUTOFF_MS) continue;

    const position =
      frame.participantFrames[String(midParticipantId)]?.position;
    if (!position) continue;

    tracked += 1;
    const perpendicularDistance =
      Math.abs(position.x - position.y) / Math.SQRT2;
    if (perpendicularDistance > MID_CORRIDOR_HALF_WIDTH_UNITS) {
      away += 1;
    }
  }

  return { tracked, away };
}
