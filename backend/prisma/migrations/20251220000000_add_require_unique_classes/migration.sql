-- Migration: Add requireUniqueClasses column to campaign_templates and campaigns

-- Add requireUniqueClasses to campaign_templates
ALTER TABLE "campaign_templates" ADD COLUMN IF NOT EXISTS "requireUniqueClasses" BOOLEAN NOT NULL DEFAULT false;

-- Add requireUniqueClasses to campaigns
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "requireUniqueClasses" BOOLEAN NOT NULL DEFAULT false;
