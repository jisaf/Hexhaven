/*
  Warnings:

  - The primary key for the `progressions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `accountId` on the `progressions` table. All the data in the column will be lost.
  - You are about to drop the column `characterClass` on the `progressions` table. All the data in the column will be lost.
  - You are about to drop the column `completedScenarios` on the `progressions` table. All the data in the column will be lost.
  - You are about to drop the column `experience` on the `progressions` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `progressions` table. All the data in the column will be lost.
  - You are about to drop the column `level` on the `progressions` table. All the data in the column will be lost.
  - You are about to drop the column `unlockedPerks` on the `progressions` table. All the data in the column will be lost.
  - Added the required column `accountUuid` to the `progressions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `characterExperience` to the `progressions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `charactersPlayed` to the `progressions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `completedScenarioIds` to the `progressions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `perksUnlocked` to the `progressions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "progressions" DROP CONSTRAINT "progressions_accountId_fkey";

-- DropIndex
DROP INDEX "progressions_accountId_characterClass_key";

-- DropIndex
DROP INDEX "progressions_accountId_idx";

-- AlterTable
ALTER TABLE "progressions" DROP CONSTRAINT "progressions_pkey",
DROP COLUMN "accountId",
DROP COLUMN "characterClass",
DROP COLUMN "completedScenarios",
DROP COLUMN "experience",
DROP COLUMN "id",
DROP COLUMN "level",
DROP COLUMN "unlockedPerks",
ADD COLUMN     "accountUuid" VARCHAR(36) NOT NULL,
ADD COLUMN     "characterExperience" JSONB NOT NULL,
ADD COLUMN     "charactersPlayed" JSONB NOT NULL,
ADD COLUMN     "completedScenarioIds" JSONB NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "perksUnlocked" JSONB NOT NULL,
ADD COLUMN     "scenarioCharacterHistory" JSONB,
ADD COLUMN     "scenariosCompleted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalExperience" INTEGER NOT NULL DEFAULT 0,
ADD CONSTRAINT "progressions_pkey" PRIMARY KEY ("accountUuid");

-- AlterTable
ALTER TABLE "scenarios" ADD COLUMN     "playerStartPositions" JSONB;

-- CreateIndex
CREATE INDEX "progressions_accountUuid_idx" ON "progressions"("accountUuid");

-- AddForeignKey
ALTER TABLE "progressions" ADD CONSTRAINT "progressions_accountUuid_fkey" FOREIGN KEY ("accountUuid") REFERENCES "accounts"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
