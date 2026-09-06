-- AlterTable
ALTER TABLE "MatchParticipant" ADD COLUMN     "killParticipation" DOUBLE PRECISION,
ADD COLUMN     "teamDamagePercentage" DOUBLE PRECISION,
ADD COLUMN     "soloKills" INTEGER,
ADD COLUMN     "turretTakedowns" INTEGER,
ADD COLUMN     "maxLevelLeadLaneOpponent" INTEGER,
ADD COLUMN     "maxCsAdvantageOnLaneOpponent" DOUBLE PRECISION,
ADD COLUMN     "dragonTakedowns" INTEGER,
ADD COLUMN     "baronTakedowns" INTEGER,
ADD COLUMN     "riftHeraldTakedowns" INTEGER,
ADD COLUMN     "controlWardsPlaced" INTEGER,
ADD COLUMN     "teamDragonKills" INTEGER,
ADD COLUMN     "teamBaronKills" INTEGER,
ADD COLUMN     "teamRiftHeraldKills" INTEGER;
