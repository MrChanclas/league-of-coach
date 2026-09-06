// One-off backfill: re-fetches every already-synced match from Riot to fill
// in the role-performance fields (killParticipation, teamDamagePercentage,
// etc.) added after those matches were first stored. Safe to re-run — it
// only ever updates existing MatchParticipant rows, never inserts.
//
// Usage: npx ts-node -r tsconfig-paths/register scripts/backfill-role-metrics.ts
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { DiscordService } from '../src/discord/discord.service';
import { RiotApiService } from '../src/riot/riot-api.service';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const riotApi = new RiotApiService(new DiscordService());

async function main() {
  const matches = await prisma.match.findMany({
    select: { id: true, matchId: true, server: true },
    orderBy: { gameCreation: 'desc' },
  });

  console.log(`Backfilling ${matches.length} matches...`);

  let matchesUpdated = 0;
  let matchesFailed = 0;
  let rowsUpdated = 0;
  let rowsUnmatched = 0;

  for (const [index, match] of matches.entries()) {
    try {
      const matchDto = await riotApi.getMatchById(match.server, match.matchId);
      const objectivesByTeam = new Map(matchDto.info.teams.map((team) => [team.teamId, team.objectives]));

      for (const participant of matchDto.info.participants) {
        const teamObjectives = objectivesByTeam.get(participant.teamId);
        // Matched by (teamId, championId) instead of puuid: puuids are
        // encrypted per Riot API key, so a match stored before an API key
        // rotation has puuids that no longer match what Riot returns today
        // for the same players (see isStalePuuidError in riot-api.service.ts).
        // Ranked matches never have two teammates on the same champion, so
        // this pair is a stable identifier across key rotations.
        const result = await prisma.matchParticipant.updateMany({
          where: { matchId: match.id, teamId: participant.teamId, championId: participant.championId },
          data: {
            killParticipation: participant.challenges?.killParticipation ?? null,
            teamDamagePercentage: participant.challenges?.teamDamagePercentage ?? null,
            soloKills: participant.challenges?.soloKills ?? null,
            turretTakedowns: participant.challenges?.turretTakedowns ?? null,
            maxLevelLeadLaneOpponent: participant.challenges?.maxLevelLeadLaneOpponent ?? null,
            maxCsAdvantageOnLaneOpponent: participant.challenges?.maxCsAdvantageOnLaneOpponent ?? null,
            dragonTakedowns: participant.challenges?.dragonTakedowns ?? null,
            baronTakedowns: participant.challenges?.baronTakedowns ?? null,
            riftHeraldTakedowns: participant.challenges?.riftHeraldTakedowns ?? null,
            controlWardsPlaced: participant.challenges?.controlWardsPlaced ?? null,
            teamDragonKills: teamObjectives?.dragon.kills ?? null,
            teamBaronKills: teamObjectives?.baron.kills ?? null,
            teamRiftHeraldKills: teamObjectives?.riftHerald.kills ?? null,
          },
        });
        rowsUpdated += result.count;
        if (result.count === 0) rowsUnmatched += 1;
      }

      matchesUpdated += 1;
    } catch (error) {
      matchesFailed += 1;
      console.warn(`  [${index + 1}/${matches.length}] ${match.matchId} failed: ${(error as Error).message}`);
    }

    if ((index + 1) % 20 === 0) {
      console.log(`  ${index + 1}/${matches.length} processed (${matchesUpdated} ok, ${matchesFailed} failed)`);
    }
  }

  console.log(
    `Done. ${matchesUpdated} matches processed ok, ${matchesFailed} matches failed, ` +
      `${rowsUpdated} participant rows updated, ${rowsUnmatched} rows unmatched.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
