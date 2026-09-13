-- AlterTable
ALTER TABLE "LolAccount" ADD COLUMN     "seasonRecoveryDoneFor" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SeasonRecoveryCandidate" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "season" TIMESTAMP(3) NOT NULL,
    "puuid" TEXT NOT NULL,
    "sharedGames" INTEGER NOT NULL,
    "cursor" TIMESTAMP(3) NOT NULL,
    "lastMatchId" TEXT,
    "checked" INTEGER NOT NULL DEFAULT 0,
    "recovered" INTEGER NOT NULL DEFAULT 0,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeasonRecoveryCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SeasonRecoveryCandidate_accountId_season_puuid_key" ON "SeasonRecoveryCandidate"("accountId", "season", "puuid");

-- AddForeignKey
ALTER TABLE "SeasonRecoveryCandidate" ADD CONSTRAINT "SeasonRecoveryCandidate_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "LolAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

