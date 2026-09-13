// League of Legends ranked seasons run for a full year, split into three
// splits (roughly January / April / August) that only reset in-game rewards
// and rank decay — not the underlying skill data. Riot doesn't tag match
// history with a season, so Pool Champ and Aprendizaje scope themselves to
// "this season" by filtering matches from this date onward instead of
// reading an account's entire multi-year history — a champion from last
// season shouldn't still weigh in on today's recommendation or lessons, but
// one played in an earlier split of the *current* season should.
//
// Update CURRENT_SEASON_START_DATE in the environment (no redeploy needed)
// once a new season starts, roughly once a year; this default is only the
// fallback for local/dev setups that don't set it.
const DEFAULT_SEASON_START_DATE = '2026-01-08'; // Season 1 2026, patch 26.1

export function getCurrentSeasonStart(): Date {
  const configured = process.env.CURRENT_SEASON_START_DATE?.trim();
  const date = new Date(configured || DEFAULT_SEASON_START_DATE);
  return Number.isNaN(date.getTime())
    ? new Date(DEFAULT_SEASON_START_DATE)
    : date;
}
