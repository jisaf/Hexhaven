-- ==========================================
-- Migration: Add Items and Inventory System (Issue #205)
-- ==========================================

-- CreateEnum: item_slot (only if not exists)
DO $$ BEGIN
    CREATE TYPE "item_slot" AS ENUM ('HEAD', 'BODY', 'LEGS', 'ONE_HAND', 'TWO_HAND', 'SMALL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: item_usage_type (only if not exists)
DO $$ BEGIN
    CREATE TYPE "item_usage_type" AS ENUM ('PERSISTENT', 'SPENT', 'CONSUMED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: item_state (only if not exists)
DO $$ BEGIN
    CREATE TYPE "item_state" AS ENUM ('READY', 'SPENT', 'CONSUMED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Note: rarity enum already exists from migration 20251202124550

-- AlterTable User: Add roles field for RBAC (only if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'roles') THEN
    ALTER TABLE "users" ADD COLUMN "roles" JSONB NOT NULL DEFAULT '["player"]';
  END IF;
END $$;

-- AlterTable Item: Add new columns (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'slot') THEN
    ALTER TABLE "items" ADD COLUMN "slot" "item_slot" DEFAULT 'SMALL';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'usageType') THEN
    ALTER TABLE "items" ADD COLUMN "usageType" "item_usage_type" DEFAULT 'CONSUMED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'maxUses') THEN
    ALTER TABLE "items" ADD COLUMN "maxUses" SMALLINT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'triggers') THEN
    ALTER TABLE "items" ADD COLUMN "triggers" JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'modifierDeckImpact') THEN
    ALTER TABLE "items" ADD COLUMN "modifierDeckImpact" JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'imageUrl') THEN
    ALTER TABLE "items" ADD COLUMN "imageUrl" VARCHAR(500);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'createdBy') THEN
    ALTER TABLE "items" ADD COLUMN "createdBy" UUID;
  END IF;
END $$;

-- Migrate existing items from "type" to "slot" (if type column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'type') THEN
    UPDATE "items"
    SET "slot" =
      CASE
        WHEN "type" ILIKE '%head%' THEN 'HEAD'::"item_slot"
        WHEN "type" ILIKE '%body%' THEN 'BODY'::"item_slot"
        WHEN "type" ILIKE '%leg%' OR "type" ILIKE '%feet%' THEN 'LEGS'::"item_slot"
        WHEN "type" ILIKE '%two%hand%' THEN 'TWO_HAND'::"item_slot"
        WHEN "type" ILIKE '%hand%' THEN 'ONE_HAND'::"item_slot"
        ELSE 'SMALL'::"item_slot"
      END;
    ALTER TABLE "items" DROP COLUMN "type";
  END IF;
END $$;

-- Make slot and usageType required (if they have defaults)
DO $$
BEGIN
  -- Make slot NOT NULL
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'slot' AND is_nullable = 'YES') THEN
    UPDATE "items" SET "slot" = 'SMALL'::"item_slot" WHERE "slot" IS NULL;
    ALTER TABLE "items" ALTER COLUMN "slot" SET NOT NULL;
    ALTER TABLE "items" ALTER COLUMN "slot" DROP DEFAULT;
  END IF;
  -- Make usageType NOT NULL
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'usageType' AND is_nullable = 'YES') THEN
    UPDATE "items" SET "usageType" = 'CONSUMED'::"item_usage_type" WHERE "usageType" IS NULL;
    ALTER TABLE "items" ALTER COLUMN "usageType" SET NOT NULL;
    ALTER TABLE "items" ALTER COLUMN "usageType" DROP DEFAULT;
  END IF;
END $$;

-- CreateTable: character_inventory (items owned by character)
CREATE TABLE IF NOT EXISTS "character_inventory" (
    "id" UUID NOT NULL,
    "characterId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "character_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable: character_equipment (items currently equipped)
CREATE TABLE IF NOT EXISTS "character_equipment" (
    "id" UUID NOT NULL,
    "characterId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "slot" "item_slot" NOT NULL,
    "slotIndex" SMALLINT NOT NULL DEFAULT 0,
    "equippedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "character_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable: character_item_states (runtime state of items during gameplay)
CREATE TABLE IF NOT EXISTS "character_item_states" (
    "id" UUID NOT NULL,
    "characterId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "state" "item_state" NOT NULL DEFAULT 'READY',
    "usesRemaining" SMALLINT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "character_item_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: character_inventory (idempotent)
CREATE INDEX IF NOT EXISTS "character_inventory_characterId_idx" ON "character_inventory"("characterId");
CREATE INDEX IF NOT EXISTS "character_inventory_itemId_idx" ON "character_inventory"("itemId");
CREATE UNIQUE INDEX IF NOT EXISTS "character_inventory_characterId_itemId_key" ON "character_inventory"("characterId", "itemId");

-- CreateIndex: character_equipment (idempotent)
CREATE INDEX IF NOT EXISTS "character_equipment_characterId_idx" ON "character_equipment"("characterId");
CREATE INDEX IF NOT EXISTS "character_equipment_itemId_idx" ON "character_equipment"("itemId");
CREATE UNIQUE INDEX IF NOT EXISTS "character_equipment_characterId_slot_slotIndex_key" ON "character_equipment"("characterId", "slot", "slotIndex");
CREATE UNIQUE INDEX IF NOT EXISTS "character_equipment_characterId_itemId_key" ON "character_equipment"("characterId", "itemId");

-- CreateIndex: character_item_states (idempotent)
CREATE INDEX IF NOT EXISTS "character_item_states_characterId_idx" ON "character_item_states"("characterId");
CREATE INDEX IF NOT EXISTS "character_item_states_itemId_idx" ON "character_item_states"("itemId");
CREATE UNIQUE INDEX IF NOT EXISTS "character_item_states_characterId_itemId_key" ON "character_item_states"("characterId", "itemId");

-- CreateIndex: items (idempotent)
CREATE INDEX IF NOT EXISTS "items_slot_idx" ON "items"("slot");
-- Note: items_rarity_idx already exists from migration 20251202124550

-- Drop old index if it exists
DROP INDEX IF EXISTS "items_type_idx";

-- AddForeignKey: character_inventory (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'character_inventory_characterId_fkey') THEN
    ALTER TABLE "character_inventory" ADD CONSTRAINT "character_inventory_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'character_inventory_itemId_fkey') THEN
    ALTER TABLE "character_inventory" ADD CONSTRAINT "character_inventory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: character_equipment (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'character_equipment_characterId_fkey') THEN
    ALTER TABLE "character_equipment" ADD CONSTRAINT "character_equipment_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'character_equipment_itemId_fkey') THEN
    ALTER TABLE "character_equipment" ADD CONSTRAINT "character_equipment_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: character_item_states (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'character_item_states_characterId_fkey') THEN
    ALTER TABLE "character_item_states" ADD CONSTRAINT "character_item_states_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'character_item_states_itemId_fkey') THEN
    ALTER TABLE "character_item_states" ADD CONSTRAINT "character_item_states_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
