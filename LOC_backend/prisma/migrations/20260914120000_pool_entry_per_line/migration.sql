-- DropIndex
DROP INDEX "PoolEntry_poolId_championKey_key";

-- CreateIndex
CREATE UNIQUE INDEX "PoolEntry_poolId_championKey_role_key" ON "PoolEntry"("poolId", "championKey", "role");
