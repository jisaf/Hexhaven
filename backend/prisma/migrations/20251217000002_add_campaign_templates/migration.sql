-- Migration: Add Campaign Templates for DB-driven campaigns (Issue #244)

-- Create campaign_templates table
CREATE TABLE IF NOT EXISTS "campaign_templates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(100) NOT NULL,
  "description" VARCHAR(500),
  "deathMode" VARCHAR(20) NOT NULL DEFAULT 'configurable',
  "minPlayers" SMALLINT NOT NULL DEFAULT 1,
  "maxPlayers" SMALLINT NOT NULL DEFAULT 4,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "campaign_templates_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on template name
CREATE UNIQUE INDEX IF NOT EXISTS "campaign_templates_name_key" ON "campaign_templates"("name");

-- Create campaign_template_scenarios table
CREATE TABLE IF NOT EXISTS "campaign_template_scenarios" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "templateId" UUID NOT NULL,
  "scenarioId" VARCHAR(100) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "description" VARCHAR(500),
  "unlocksScenarios" JSONB NOT NULL DEFAULT '[]',
  "isStarting" BOOLEAN NOT NULL DEFAULT false,
  "sequence" SMALLINT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "campaign_template_scenarios_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on template + scenario combination
CREATE UNIQUE INDEX IF NOT EXISTS "campaign_template_scenarios_templateId_scenarioId_key"
  ON "campaign_template_scenarios"("templateId", "scenarioId");

-- Create index on templateId for faster lookups
CREATE INDEX IF NOT EXISTS "campaign_template_scenarios_templateId_idx"
  ON "campaign_template_scenarios"("templateId");

-- Add foreign key from campaign_template_scenarios to campaign_templates
ALTER TABLE "campaign_template_scenarios"
  ADD CONSTRAINT "campaign_template_scenarios_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "campaign_templates"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Add templateId column to campaigns table
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "templateId" UUID;

-- Create index on campaigns.templateId
CREATE INDEX IF NOT EXISTS "campaigns_templateId_idx" ON "campaigns"("templateId");

-- Add foreign key from campaigns to campaign_templates
ALTER TABLE "campaigns"
  ADD CONSTRAINT "campaigns_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "campaign_templates"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
