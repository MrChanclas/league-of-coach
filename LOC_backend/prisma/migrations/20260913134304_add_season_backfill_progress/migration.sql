-- AlterTable
ALTER TABLE "LolAccount" ADD COLUMN     "seasonBackfillCursor" TIMESTAMP(3),
ADD COLUMN     "seasonBackfillDoneFor" TIMESTAMP(3);
