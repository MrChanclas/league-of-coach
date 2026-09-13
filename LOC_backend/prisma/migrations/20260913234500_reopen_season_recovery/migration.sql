-- Reopen the season recovery fallback for every account.
--
-- The first version picked teammates by games shared across the whole
-- stored season, which favours whoever the account queues with now. Their
-- lists often don't reach back past the point where the account's own list
-- ends, so accounts could exhaust their teammate allowance on empty lists and
-- close without recovering anything. Accounts with nothing missing close again
-- on their first round; teammates already searched stay recorded and are not
-- searched twice.
UPDATE "LolAccount" SET "seasonRecoveryDoneFor" = NULL;
