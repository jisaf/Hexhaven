/*
  Warnings:

  - You are about to drop the column `inventory` on the `characters` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "campaign_template_scenarios" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "campaign_templates" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "character_classes" ADD COLUMN     "baseAttack" SMALLINT NOT NULL DEFAULT 2,
ADD COLUMN     "baseMovement" SMALLINT NOT NULL DEFAULT 2,
ADD COLUMN     "baseRange" SMALLINT NOT NULL DEFAULT 1,
ADD COLUMN     "color" VARCHAR(7) NOT NULL DEFAULT '#666666';

-- AlterTable
ALTER TABLE "characters" DROP COLUMN "inventory";
