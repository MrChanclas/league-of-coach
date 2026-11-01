import type { Prisma } from '@prisma/client';

// What another player gets to see of an account: the public Riot identity
// and rank. Never the owner's name or email.
export const DUO_ACCOUNT_SELECT = {
  id: true,
  summoner: true,
  tag: true,
  server: true,
  puuid: true,
  profileIconId: true,
  summonerLevel: true,
  soloTier: true,
  soloDivision: true,
  soloLp: true,
  flexTier: true,
  flexDivision: true,
  flexLp: true,
  verifiedAt: true,
} satisfies Prisma.LolAccountSelect;

export type DuoAccount = Prisma.LolAccountGetPayload<{
  select: typeof DUO_ACCOUNT_SELECT;
}>;

export function rankForQueue(account: DuoAccount, queue: string) {
  return queue === 'flex'
    ? {
        tier: account.flexTier,
        division: account.flexDivision,
        lp: account.flexLp,
      }
    : {
        tier: account.soloTier,
        division: account.soloDivision,
        lp: account.soloLp,
      };
}

export function toAccountCard(account: DuoAccount, queue: string) {
  return {
    summoner: account.summoner,
    tag: account.tag,
    server: account.server,
    profileIconId: account.profileIconId,
    summonerLevel: account.summonerLevel,
    ...rankForQueue(account, queue),
  };
}
