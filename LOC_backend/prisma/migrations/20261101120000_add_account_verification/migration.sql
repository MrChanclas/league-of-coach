-- AlterTable
ALTER TABLE "LolAccount" ADD COLUMN     "verifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AccountVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "puuid" TEXT NOT NULL,
    "server" TEXT NOT NULL,
    "summoner" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "iconId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountVerification_userId_key" ON "AccountVerification"("userId");

-- AddForeignKey
ALTER TABLE "AccountVerification" ADD CONSTRAINT "AccountVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
