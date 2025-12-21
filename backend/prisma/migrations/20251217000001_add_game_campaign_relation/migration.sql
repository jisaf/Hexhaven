-- Migration: Add campaignId to games table (Issue #244 - Campaign Mode)

-- Add campaignId column to games table
ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "campaignId" UUID;

-- Add index for campaign queries
CREATE INDEX IF NOT EXISTS "games_campaignId_idx" ON "games"("campaignId");

-- Add foreign key constraint
ALTER TABLE "games" ADD CONSTRAINT "games_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
