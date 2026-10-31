-- AlterTable
ALTER TABLE "User" ADD COLUMN     "discordId" TEXT,
ADD COLUMN     "discordUsername" TEXT;

-- CreateTable
CREATE TABLE "DuoProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "queue" TEXT NOT NULL,
    "roles" TEXT[],
    "lookingFor" TEXT[],
    "availability" TEXT[],
    "note" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DuoProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DuoRequest" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "fromAccountId" TEXT NOT NULL,
    "toAccountId" TEXT NOT NULL,
    "queue" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "DuoRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Duo" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "accountAId" TEXT NOT NULL,
    "accountBId" TEXT NOT NULL,
    "queue" TEXT NOT NULL,
    "lastReadAtA" TIMESTAMP(3),
    "lastReadAtB" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "Duo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DuoGoal" (
    "id" TEXT NOT NULL,
    "duoId" TEXT NOT NULL,
    "targetTier" TEXT NOT NULL,
    "targetDivision" TEXT,
    "deadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DuoGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DuoMessage" (
    "id" TEXT NOT NULL,
    "duoId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DuoMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DuoReport" (
    "id" TEXT NOT NULL,
    "duoId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DuoReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DuoProfile_userId_key" ON "DuoProfile"("userId");

-- CreateIndex
CREATE INDEX "DuoProfile_active_queue_idx" ON "DuoProfile"("active", "queue");

-- CreateIndex
CREATE INDEX "DuoProfile_accountId_idx" ON "DuoProfile"("accountId");

-- CreateIndex
CREATE INDEX "DuoRequest_toUserId_status_idx" ON "DuoRequest"("toUserId", "status");

-- CreateIndex
CREATE INDEX "DuoRequest_fromUserId_status_idx" ON "DuoRequest"("fromUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Duo_requestId_key" ON "Duo"("requestId");

-- CreateIndex
CREATE INDEX "Duo_userAId_idx" ON "Duo"("userAId");

-- CreateIndex
CREATE INDEX "Duo_userBId_idx" ON "Duo"("userBId");

-- CreateIndex
CREATE UNIQUE INDEX "DuoGoal_duoId_key" ON "DuoGoal"("duoId");

-- CreateIndex
CREATE INDEX "DuoMessage_duoId_createdAt_idx" ON "DuoMessage"("duoId", "createdAt");

-- CreateIndex
CREATE INDEX "DuoReport_duoId_idx" ON "DuoReport"("duoId");

-- CreateIndex
CREATE UNIQUE INDEX "User_discordId_key" ON "User"("discordId");

-- AddForeignKey
ALTER TABLE "DuoProfile" ADD CONSTRAINT "DuoProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuoProfile" ADD CONSTRAINT "DuoProfile_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "LolAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuoRequest" ADD CONSTRAINT "DuoRequest_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuoRequest" ADD CONSTRAINT "DuoRequest_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuoRequest" ADD CONSTRAINT "DuoRequest_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "LolAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuoRequest" ADD CONSTRAINT "DuoRequest_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "LolAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Duo" ADD CONSTRAINT "Duo_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "DuoRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Duo" ADD CONSTRAINT "Duo_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Duo" ADD CONSTRAINT "Duo_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Duo" ADD CONSTRAINT "Duo_accountAId_fkey" FOREIGN KEY ("accountAId") REFERENCES "LolAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Duo" ADD CONSTRAINT "Duo_accountBId_fkey" FOREIGN KEY ("accountBId") REFERENCES "LolAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuoGoal" ADD CONSTRAINT "DuoGoal_duoId_fkey" FOREIGN KEY ("duoId") REFERENCES "Duo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuoMessage" ADD CONSTRAINT "DuoMessage_duoId_fkey" FOREIGN KEY ("duoId") REFERENCES "Duo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuoMessage" ADD CONSTRAINT "DuoMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuoReport" ADD CONSTRAINT "DuoReport_duoId_fkey" FOREIGN KEY ("duoId") REFERENCES "Duo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuoReport" ADD CONSTRAINT "DuoReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

