-- AlterTable: Add column as nullable first
ALTER TABLE "campaigns" ADD COLUMN "createdByUserId" UUID;

-- Data Migration: Set createdByUserId to the userId of the first character in each campaign
-- For campaigns without characters, this will remain NULL temporarily
UPDATE "campaigns" c
SET "createdByUserId" = (
  SELECT ch."userId"
  FROM "characters" ch
  WHERE ch."campaignId" = c.id
  ORDER BY ch."createdAt" ASC
  LIMIT 1
)
WHERE "createdByUserId" IS NULL;

-- For any remaining campaigns without characters (edge case), delete them or set to a system user
-- Here we delete orphaned campaigns as they have no members
DELETE FROM "campaigns" WHERE "createdByUserId" IS NULL;

-- AlterTable: Make column NOT NULL after data migration
ALTER TABLE "campaigns" ALTER COLUMN "createdByUserId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "campaigns_createdByUserId_idx" ON "campaigns"("createdByUserId");

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
