-- CreateEnum
CREATE TYPE "room_status" AS ENUM ('lobby', 'active', 'completed', 'abandoned');

-- CreateEnum
CREATE TYPE "connection_status" AS ENUM ('connected', 'disconnected', 'reconnecting');

-- CreateTable
CREATE TABLE "game_rooms" (
    "id" UUID NOT NULL,
    "roomCode" VARCHAR(6) NOT NULL,
    "status" "room_status" NOT NULL,
    "scenarioId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" UUID NOT NULL,
    "uuid" VARCHAR(36) NOT NULL,
    "nickname" VARCHAR(50) NOT NULL,
    "roomId" UUID,
    "isHost" BOOLEAN NOT NULL DEFAULT false,
    "connectionStatus" "connection_status" NOT NULL DEFAULT 'connected',
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_states" (
    "roomId" UUID NOT NULL,
    "state" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_states_pkey" PRIMARY KEY ("roomId")
);

-- CreateTable
CREATE TABLE "scenarios" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "difficulty" SMALLINT NOT NULL,
    "mapLayout" JSONB NOT NULL,
    "monsterGroups" JSONB NOT NULL,
    "objectivePrimary" VARCHAR(500) NOT NULL,
    "objectiveSecondary" VARCHAR(500),
    "treasures" JSONB,

    CONSTRAINT "scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_classes" (
    "id" UUID NOT NULL,
    "className" VARCHAR(50) NOT NULL,
    "maxHealth" SMALLINT NOT NULL,
    "abilityDeck" JSONB NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "imageUrl" VARCHAR(255),

    CONSTRAINT "character_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "uuid" VARCHAR(36) NOT NULL,
    "email" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progressions" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "characterClass" VARCHAR(50) NOT NULL,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "level" SMALLINT NOT NULL DEFAULT 1,
    "unlockedPerks" JSONB NOT NULL,
    "completedScenarios" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "progressions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "game_rooms_roomCode_key" ON "game_rooms"("roomCode");

-- CreateIndex
CREATE INDEX "game_rooms_roomCode_idx" ON "game_rooms"("roomCode");

-- CreateIndex
CREATE INDEX "game_rooms_status_idx" ON "game_rooms"("status");

-- CreateIndex
CREATE INDEX "game_rooms_expiresAt_idx" ON "game_rooms"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "players_uuid_key" ON "players"("uuid");

-- CreateIndex
CREATE INDEX "players_uuid_idx" ON "players"("uuid");

-- CreateIndex
CREATE INDEX "players_roomId_idx" ON "players"("roomId");

-- CreateIndex
CREATE INDEX "scenarios_difficulty_idx" ON "scenarios"("difficulty");

-- CreateIndex
CREATE UNIQUE INDEX "character_classes_className_key" ON "character_classes"("className");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_uuid_key" ON "accounts"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_email_key" ON "accounts"("email");

-- CreateIndex
CREATE INDEX "accounts_uuid_idx" ON "accounts"("uuid");

-- CreateIndex
CREATE INDEX "accounts_email_idx" ON "accounts"("email");

-- CreateIndex
CREATE INDEX "progressions_accountId_idx" ON "progressions"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "progressions_accountId_characterClass_key" ON "progressions"("accountId", "characterClass");

-- AddForeignKey
ALTER TABLE "game_rooms" ADD CONSTRAINT "game_rooms_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "scenarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "game_rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_states" ADD CONSTRAINT "game_states_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "game_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progressions" ADD CONSTRAINT "progressions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
