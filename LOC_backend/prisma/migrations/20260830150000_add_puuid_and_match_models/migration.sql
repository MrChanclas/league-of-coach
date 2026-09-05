-- AlterTable
ALTER TABLE "LolAccount" ADD COLUMN     "puuid" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "server" TEXT NOT NULL,
    "gameCreation" TIMESTAMP(3) NOT NULL,
    "gameDuration" INTEGER NOT NULL,
    "gameMode" TEXT NOT NULL,
    "gameVersion" TEXT NOT NULL,
    "queueId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchParticipant" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "puuid" TEXT NOT NULL,
    "champion" TEXT NOT NULL,
    "championId" INTEGER NOT NULL,
    "teamPosition" TEXT NOT NULL,
    "win" BOOLEAN NOT NULL,
    "kills" INTEGER NOT NULL,
    "deaths" INTEGER NOT NULL,
    "assists" INTEGER NOT NULL,
    "csTotal" INTEGER NOT NULL,
    "goldEarned" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Match_matchId_key" ON "Match"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchParticipant_matchId_accountId_key" ON "MatchParticipant"("matchId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "ChampionLearning_accountId_champion_role_key" ON "ChampionLearning"("accountId", "champion", "role");

-- CreateIndex
CREATE UNIQUE INDEX "LolAccount_puuid_key" ON "LolAccount"("puuid");

-- AddForeignKey
ALTER TABLE "MatchParticipant" ADD CONSTRAINT "MatchParticipant_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchParticipant" ADD CONSTRAINT "MatchParticipant_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "LolAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

