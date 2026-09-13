import { rankTeammates } from './season-recovery';

describe('rankTeammates', () => {
  const ownGames = [
    { matchId: 'm1', teamId: 100 },
    { matchId: 'm2', teamId: 200 },
    { matchId: 'm3', teamId: 100 },
  ];

  it('counts only players on the account side, most shared games first', () => {
    const lobbyPlayers = [
      { matchId: 'm1', teamId: 100, puuid: 'me' },
      { matchId: 'm1', teamId: 100, puuid: 'duo' },
      { matchId: 'm1', teamId: 200, puuid: 'opponent' },
      { matchId: 'm2', teamId: 200, puuid: 'duo' },
      { matchId: 'm2', teamId: 100, puuid: 'opponent' },
      { matchId: 'm3', teamId: 100, puuid: 'duo' },
      { matchId: 'm3', teamId: 100, puuid: 'random' },
      { matchId: 'm3', teamId: 200, puuid: 'opponent' },
    ];

    expect(rankTeammates(ownGames, lobbyPlayers, 'me')).toEqual([
      { puuid: 'duo', sharedGames: 3 },
      { puuid: 'random', sharedGames: 1 },
    ]);
  });

  it('ignores players from games the account did not play', () => {
    const lobbyPlayers = [{ matchId: 'other', teamId: 100, puuid: 'duo' }];

    expect(rankTeammates(ownGames, lobbyPlayers, 'me')).toEqual([]);
  });
});
