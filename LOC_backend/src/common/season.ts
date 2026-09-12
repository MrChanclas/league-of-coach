// League of Legends ranked seasons are divided into three splits (roughly
// January / April / August). Riot doesn't tag match history with a split, so
// Pool Champ and Aprendizaje scope themselves to "this split" by filtering
// matches from this date onward instead of reading an account's entire
// history — a champion you abandoned two splits ago shouldn't still weigh in
// on today's recommendation or lessons.
//
// Update CURRENT_SPLIT_START_DATE in the environment (no redeploy needed)
// once a new split starts; this default is only the fallback for local/dev
// setups that don't set it.
const DEFAULT_SPLIT_START_DATE = '2026-07-29'; // Season 3 2026, patch 26.15

export function getCurrentSplitStart(): Date {
  const configured = process.env.CURRENT_SPLIT_START_DATE?.trim();
  const date = new Date(configured || DEFAULT_SPLIT_START_DATE);
  return Number.isNaN(date.getTime())
    ? new Date(DEFAULT_SPLIT_START_DATE)
    : date;
}
