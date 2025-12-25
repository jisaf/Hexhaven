-- Migration: Add Campaign Shop System (Issue #328)
-- Creates shop inventory and transaction tracking for campaigns
-- Idempotent pattern following existing migration conventions

-- Create transaction_type enum if not exists
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_enum WHERE enumname = 'transaction_type') THEN
    CREATE TYPE "transaction_type" AS ENUM ('BUY', 'SELL');
  END IF;
END $$;

-- Add shopConfig column to campaigns table
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "shopConfig" JSONB NOT NULL DEFAULT '{}';

-- Create campaign_shop_inventory table
CREATE TABLE IF NOT EXISTS "campaign_shop_inventory" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "quantity" SMALLINT NOT NULL,
    "initialQuantity" SMALLINT NOT NULL,
    "lastRestockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_shop_inventory_pkey" PRIMARY KEY ("id")
);

-- Create shop_transactions table
CREATE TABLE IF NOT EXISTS "shop_transactions" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "characterId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "transactionType" "transaction_type" NOT NULL,
    "goldAmount" INTEGER NOT NULL,
    "quantity" SMALLINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_transactions_pkey" PRIMARY KEY ("id")
);

-- Create indexes for campaign_shop_inventory
CREATE UNIQUE INDEX IF NOT EXISTS "campaign_shop_inventory_campaignId_itemId_key" ON "campaign_shop_inventory"("campaignId", "itemId");
CREATE INDEX IF NOT EXISTS "campaign_shop_inventory_campaignId_idx" ON "campaign_shop_inventory"("campaignId");
CREATE INDEX IF NOT EXISTS "campaign_shop_inventory_itemId_idx" ON "campaign_shop_inventory"("itemId");

-- Create indexes for shop_transactions
CREATE INDEX IF NOT EXISTS "shop_transactions_campaignId_idx" ON "shop_transactions"("campaignId");
CREATE INDEX IF NOT EXISTS "shop_transactions_characterId_idx" ON "shop_transactions"("characterId");
CREATE INDEX IF NOT EXISTS "shop_transactions_itemId_idx" ON "shop_transactions"("itemId");
CREATE INDEX IF NOT EXISTS "shop_transactions_createdAt_idx" ON "shop_transactions"("createdAt");

-- Add foreign keys for campaign_shop_inventory (if not already present)
DO $$
BEGIN
  IF NOT EXISTS(
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'campaign_shop_inventory_campaignId_fkey'
  ) THEN
    ALTER TABLE "campaign_shop_inventory" ADD CONSTRAINT "campaign_shop_inventory_campaignId_fkey"
      FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS(
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'campaign_shop_inventory_itemId_fkey'
  ) THEN
    ALTER TABLE "campaign_shop_inventory" ADD CONSTRAINT "campaign_shop_inventory_itemId_fkey"
      FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Add foreign keys for shop_transactions (if not already present)
DO $$
BEGIN
  IF NOT EXISTS(
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'shop_transactions_campaignId_fkey'
  ) THEN
    ALTER TABLE "shop_transactions" ADD CONSTRAINT "shop_transactions_campaignId_fkey"
      FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS(
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'shop_transactions_characterId_fkey'
  ) THEN
    ALTER TABLE "shop_transactions" ADD CONSTRAINT "shop_transactions_characterId_fkey"
      FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS(
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'shop_transactions_itemId_fkey'
  ) THEN
    ALTER TABLE "shop_transactions" ADD CONSTRAINT "shop_transactions_itemId_fkey"
      FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
