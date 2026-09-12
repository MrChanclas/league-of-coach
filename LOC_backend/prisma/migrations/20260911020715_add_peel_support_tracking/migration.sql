-- AlterTable
ALTER TABLE "MatchParticipant" ADD COLUMN     "peelAdcDeathsTracked" INTEGER,
ADD COLUMN     "peelAdcDeathsUnguarded" INTEGER;

-- CreateTable
CREATE TABLE "ChampionGuide" (
    "id" TEXT NOT NULL,
    "championKey" TEXT NOT NULL,
    "patchVersion" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChampionGuide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChampionGuide_championKey_key" ON "ChampionGuide"("championKey");
