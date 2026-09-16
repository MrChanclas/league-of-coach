/**
 * Cuánto puede gastar cada fase de la sincronización en una sola llamada.
 *
 * Están juntos a propósito: todos reparten el mismo recurso escaso, el
 * límite de peticiones de la API de Riot (~95 cada 2 minutos con una clave
 * de desarrollo), y las fases se ejecutan una detrás de otra dentro del
 * mismo request. Ajustar uno sin mirar los demás es lo que hace que una
 * sincronización se pase del tiempo límite de Cloud Run.
 */

// Page size for the account's own history. Riot accepts up to
// MATCH_IDS_MAX_COUNT, but every new id on a page is also a match download,
// so pages stay the size of a round's download budget.
export const PAGE_SIZE = 20;

// How many pages the top-up phase pages back through in one call. It only
// has to reach the history we already had, so this is just a guard against a
// runaway loop — anything deeper than this is the season backfill's job,
// which resumes across calls instead of stretching a single HTTP request
// past its timeout.
export const MAX_TOPUP_PAGES = 5;

// Initial backfill depth for a brand-new account link, matching the "20
// partidas por análisis" the app promises. Irrelevant once an account
// already has some history.
export const DEFAULT_TARGET_MATCH_COUNT = 20;

// Budget for the season backfill in a single sync call. Riot's development
// key allows ~95 requests per 2 minutes and each new match costs one match
// fetch (plus, sometimes, a timeline fetch), so a full season can't possibly
// be fetched in one request — it's split across successive calls, with the
// client re-calling until `seasonBackfill.done` comes back true.
export const MAX_BACKFILL_MATCHES_PER_SYNC = 20;

// Pages of already-stored history the sweep is willing to re-verify in one
// call. These cost a single cheap list request each (no match fetches), and
// this cap only matters while re-verifying a long stretch of known games.
export const MAX_BACKFILL_PAGES_PER_SYNC = 20;

// How long continuePendingBackfills keeps handing out rounds. A round can
// take about a minute, so this leaves room for the one in flight to finish
// inside Cloud Run's 300s request timeout (and inside the scheduler job's
// attempt deadline) instead of being cut off mid-page.
export const BACKFILL_JOB_BUDGET_MS = 150_000;

// Match downloads per recovery round, the same share of the rate limit a
// season backfill round gets.
export const MAX_RECOVERY_FETCHES_PER_ROUND = MAX_BACKFILL_MATCHES_PER_SYNC;
