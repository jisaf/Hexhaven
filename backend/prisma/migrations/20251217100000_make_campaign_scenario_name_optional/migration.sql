-- Migration: Make campaign template scenario name optional (Issue #244)
-- The scenario itself has a name, campaign template can optionally override it

-- Make name column nullable
ALTER TABLE "campaign_template_scenarios" ALTER COLUMN "name" DROP NOT NULL;
