-- Postgres doesn't create indexes for foreign keys on its own. These cover
-- the filters the stats, rank history, goals and dashboard queries use.

-- CreateIndex
CREATE INDEX "LolAccount_userId_idx" ON "LolAccount"("userId");

-- CreateIndex
CREATE INDEX "RankSnapshot_accountId_queueType_capturedAt_idx" ON "RankSnapshot"("accountId", "queueType", "capturedAt");

-- CreateIndex
CREATE INDEX "Goal_accountId_idx" ON "Goal"("accountId");

-- CreateIndex
CREATE INDEX "Match_gameCreation_idx" ON "Match"("gameCreation");

-- CreateIndex
CREATE INDEX "MatchParticipant_accountId_idx" ON "MatchParticipant"("accountId");

-- CreateIndex
CREATE INDEX "MatchParticipant_puuid_idx" ON "MatchParticipant"("puuid");
