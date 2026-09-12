-- CreateTable
CREATE TABLE "ChampionPool" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChampionPool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoolEntry" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "championKey" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'testing',
    "note" TEXT,
    "addedBy" TEXT NOT NULL DEFAULT 'player',
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PoolEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChampionPool_accountId_key" ON "ChampionPool"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "PoolEntry_poolId_championKey_key" ON "PoolEntry"("poolId", "championKey");

-- AddForeignKey
ALTER TABLE "ChampionPool" ADD CONSTRAINT "ChampionPool_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "LolAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolEntry" ADD CONSTRAINT "PoolEntry_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "ChampionPool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
