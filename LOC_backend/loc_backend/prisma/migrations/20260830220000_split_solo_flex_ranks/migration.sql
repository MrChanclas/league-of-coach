-- AlterTable
ALTER TABLE "LolAccount" DROP COLUMN "division",
DROP COLUMN "lp",
DROP COLUMN "tier",
ADD COLUMN     "flexDivision" TEXT NOT NULL DEFAULT 'Unranked',
ADD COLUMN     "flexLp" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "flexTier" TEXT NOT NULL DEFAULT 'Unranked',
ADD COLUMN     "soloDivision" TEXT NOT NULL DEFAULT 'Unranked',
ADD COLUMN     "soloLp" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "soloTier" TEXT NOT NULL DEFAULT 'Unranked';

