-- AlterTable
ALTER TABLE "DuoReport" ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending';

-- CreateTable
CREATE TABLE "Strike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reportId" TEXT,
    "severity" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Strike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Strike_userId_idx" ON "Strike"("userId");

-- CreateIndex
CREATE INDEX "DuoReport_status_idx" ON "DuoReport"("status");

-- AddForeignKey
ALTER TABLE "Strike" ADD CONSTRAINT "Strike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Strike" ADD CONSTRAINT "Strike_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "DuoReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

