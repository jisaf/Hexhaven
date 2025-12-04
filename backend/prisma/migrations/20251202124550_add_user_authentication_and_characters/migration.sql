-- CreateEnum
CREATE TYPE "game_status" AS ENUM ('LOBBY', 'ACTIVE', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "enhancement_slot" AS ENUM ('TOP', 'BOTTOM');

-- CreateEnum
CREATE TYPE "rarity" AS ENUM ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- DropForeignKey
ALTER TABLE "game_rooms" DROP CONSTRAINT "game_rooms_scenarioId_fkey";

-- DropForeignKey
ALTER TABLE "game_states" DROP CONSTRAINT "game_states_roomId_fkey";

-- DropForeignKey
ALTER TABLE "progressions" DROP CONSTRAINT "progressions_accountUuid_fkey";

-- DropIndex
DROP INDEX "character_classes_className_key";

-- AlterTable
ALTER TABLE "character_classes" DROP COLUMN "abilityDeck",
DROP COLUMN "className",
DROP COLUMN "maxHealth",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "handSize" SMALLINT NOT NULL,
ADD COLUMN     "maxHealthByLevel" JSONB NOT NULL,
ADD COLUMN     "name" VARCHAR(50) NOT NULL,
ADD COLUMN     "perks" JSONB NOT NULL,
ADD COLUMN     "startingHealth" SMALLINT NOT NULL;

-- AlterTable
ALTER TABLE "game_rooms" ALTER COLUMN "status" SET DEFAULT 'lobby';

-- AlterTable
ALTER TABLE "game_states" DROP CONSTRAINT "game_states_pkey",
DROP COLUMN "roomId",
DROP COLUMN "state",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "gameId" UUID NOT NULL,
ADD COLUMN     "id" UUID NOT NULL,
ADD COLUMN     "sequenceNum" INTEGER NOT NULL,
ADD COLUMN     "stateData" JSONB NOT NULL,
ADD CONSTRAINT "game_states_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "scenarios" DROP COLUMN "objectivePrimary",
DROP COLUMN "objectiveSecondary",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "objectives" JSONB NOT NULL;

-- DropTable
DROP TABLE "accounts";

-- DropTable
DROP TABLE "progressions";

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "username" VARCHAR(20) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "failedLoginAttempts" SMALLINT NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ability_cards" (
    "id" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "level" SMALLINT NOT NULL,
    "initiative" SMALLINT NOT NULL,
    "topAction" JSONB NOT NULL,
    "bottomAction" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ability_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "characters" (
    "id" UUID NOT NULL,
    "name" VARCHAR(30) NOT NULL,
    "userId" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "level" SMALLINT NOT NULL DEFAULT 1,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "gold" INTEGER NOT NULL DEFAULT 0,
    "health" SMALLINT NOT NULL,
    "perks" JSONB NOT NULL DEFAULT '[]',
    "inventory" JSONB NOT NULL DEFAULT '[]',
    "currentGameId" UUID,
    "campaignId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "characters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_enhancements" (
    "id" UUID NOT NULL,
    "characterId" UUID NOT NULL,
    "cardId" UUID NOT NULL,
    "slot" "enhancement_slot" NOT NULL,
    "enhancementType" VARCHAR(50) NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_enhancements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "rarity" "rarity" NOT NULL,
    "effects" JSONB NOT NULL,
    "cost" INTEGER NOT NULL,
    "description" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" UUID NOT NULL,
    "roomCode" VARCHAR(6) NOT NULL,
    "scenarioId" UUID,
    "status" "game_status" NOT NULL DEFAULT 'LOBBY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_events" (
    "id" UUID NOT NULL,
    "gameId" UUID NOT NULL,
    "sequenceNum" INTEGER NOT NULL,
    "eventType" VARCHAR(50) NOT NULL,
    "eventData" JSONB NOT NULL,
    "playerId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "prosperityLevel" SMALLINT NOT NULL DEFAULT 1,
    "reputation" SMALLINT NOT NULL DEFAULT 0,
    "completedScenarios" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "ability_cards_classId_idx" ON "ability_cards"("classId");

-- CreateIndex
CREATE INDEX "ability_cards_level_idx" ON "ability_cards"("level");

-- CreateIndex
CREATE INDEX "characters_userId_idx" ON "characters"("userId");

-- CreateIndex
CREATE INDEX "characters_classId_idx" ON "characters"("classId");

-- CreateIndex
CREATE INDEX "characters_currentGameId_idx" ON "characters"("currentGameId");

-- CreateIndex
CREATE INDEX "characters_campaignId_idx" ON "characters"("campaignId");

-- CreateIndex
CREATE INDEX "card_enhancements_characterId_idx" ON "card_enhancements"("characterId");

-- CreateIndex
CREATE INDEX "card_enhancements_cardId_idx" ON "card_enhancements"("cardId");

-- CreateIndex
CREATE INDEX "items_rarity_idx" ON "items"("rarity");

-- CreateIndex
CREATE INDEX "items_type_idx" ON "items"("type");

-- CreateIndex
CREATE UNIQUE INDEX "games_roomCode_key" ON "games"("roomCode");

-- CreateIndex
CREATE INDEX "games_roomCode_idx" ON "games"("roomCode");

-- CreateIndex
CREATE INDEX "games_status_idx" ON "games"("status");

-- CreateIndex
CREATE INDEX "games_createdAt_idx" ON "games"("createdAt");

-- CreateIndex
CREATE INDEX "game_events_gameId_sequenceNum_idx" ON "game_events"("gameId", "sequenceNum");

-- CreateIndex
CREATE UNIQUE INDEX "game_events_gameId_sequenceNum_key" ON "game_events"("gameId", "sequenceNum");

-- CreateIndex
CREATE UNIQUE INDEX "character_classes_name_key" ON "character_classes"("name");

-- CreateIndex
CREATE UNIQUE INDEX "game_states_gameId_key" ON "game_states"("gameId");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ability_cards" ADD CONSTRAINT "ability_cards_classId_fkey" FOREIGN KEY ("classId") REFERENCES "character_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_classId_fkey" FOREIGN KEY ("classId") REFERENCES "character_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_currentGameId_fkey" FOREIGN KEY ("currentGameId") REFERENCES "games"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_enhancements" ADD CONSTRAINT "card_enhancements_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_enhancements" ADD CONSTRAINT "card_enhancements_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "ability_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "scenarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_states" ADD CONSTRAINT "game_states_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

