-- DropIndex
DROP INDEX "MatchParticipant_matchId_accountId_key";

-- AlterTable
ALTER TABLE "MatchParticipant" ADD COLUMN     "damageDealt" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "itemIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "visionScore" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "accountId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "RankSnapshot" (
    "id" TEXT NOT NULL,
    "queueType" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "division" TEXT NOT NULL,
    "lp" INTEGER NOT NULL,
    "accountId" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MatchParticipant_matchId_puuid_key" ON "MatchParticipant"("matchId", "puuid");

-- AddForeignKey
ALTER TABLE "RankSnapshot" ADD CONSTRAINT "RankSnapshot_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "LolAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

