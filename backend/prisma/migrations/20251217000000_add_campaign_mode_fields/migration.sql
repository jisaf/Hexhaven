-- Add campaign mode fields to campaigns table
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "description" VARCHAR(500);
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "deathMode" VARCHAR(20) NOT NULL DEFAULT 'healing';
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "retiredCharacterIds" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "unlockedScenarios" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "isCompleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);

-- Add retired field to characters table
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "retired" BOOLEAN NOT NULL DEFAULT false;
