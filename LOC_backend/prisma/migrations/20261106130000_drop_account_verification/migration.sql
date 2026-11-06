-- Icon verification was removed in 20261106120000_add_moderation's release;
-- nothing reads these anymore.

-- DropForeignKey
ALTER TABLE "AccountVerification" DROP CONSTRAINT "AccountVerification_userId_fkey";

-- AlterTable
ALTER TABLE "LolAccount" DROP COLUMN "verifiedAt";

-- DropTable
DROP TABLE "AccountVerification";
