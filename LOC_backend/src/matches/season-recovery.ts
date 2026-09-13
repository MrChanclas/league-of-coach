// Riot doesn't count a remake as a win or a loss, so any game shorter than
// this is left out when stored history is compared with an account's ranked
// wins + losses.
export const REMAKE_MAX_SECONDS = 300;

export type OwnTeamGame = { matchId: string; teamId: number };
export type LobbyPlayer = { matchId: string; teamId: number; puuid: string };

/**
 * Players who shared the account's side of the map, most shared games first.
 *
 * The season recovery fallback searches these players' match lists for games
 * missing from the account's own list: someone the account keeps queueing
 * with (a duo) is in most of its games, so their list reaches the same games.
 * Opponents are left out on purpose - meeting someone on the other team a few
 * times says nothing about the games in between.
 */
export function rankTeammates(
  ownGames: OwnTeamGame[],
  lobbyPlayers: LobbyPlayer[],
  ownPuuid: string,
): Array<{ puuid: string; sharedGames: number }> {
  const teamByMatch = new Map(
    ownGames.map((game) => [game.matchId, game.teamId]),
  );
  const sharedGames = new Map<string, number>();

  for (const player of lobbyPlayers) {
    if (player.puuid === ownPuuid) continue;
    if (teamByMatch.get(player.matchId) !== player.teamId) continue;
    sharedGames.set(player.puuid, (sharedGames.get(player.puuid) ?? 0) + 1);
  }

  return [...sharedGames]
    .map(([puuid, games]) => ({ puuid, sharedGames: games }))
    .sort(
      (a, b) => b.sharedGames - a.sharedGames || a.puuid.localeCompare(b.puuid),
    );
}
