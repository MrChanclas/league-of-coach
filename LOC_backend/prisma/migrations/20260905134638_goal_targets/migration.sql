/*
  Warnings:

  - You are about to drop the column `progress` on the `Goal` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Goal` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Goal" DROP COLUMN "progress",
DROP COLUMN "title",
ADD COLUMN     "queueType" TEXT,
ADD COLUMN     "startDivision" TEXT,
ADD COLUMN     "startTier" TEXT,
ADD COLUMN     "targetChampion" TEXT,
ADD COLUMN     "targetDivision" TEXT,
ADD COLUMN     "targetKda" DOUBLE PRECISION,
ADD COLUMN     "targetRole" TEXT,
ADD COLUMN     "targetTier" TEXT,
ADD COLUMN     "targetWinrate" DOUBLE PRECISION;
