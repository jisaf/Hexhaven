-- CreateTable
CREATE TABLE "game_results" (
    "id" UUID NOT NULL,
    "gameId" UUID NOT NULL,
    "roomCode" VARCHAR(6) NOT NULL,
    "scenarioId" UUID,
    "scenarioName" VARCHAR(100),
    "victory" BOOLEAN NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roundsCompleted" SMALLINT NOT NULL,
    "completionTimeMs" INTEGER,
    "primaryObjectiveCompleted" BOOLEAN NOT NULL DEFAULT false,
    "secondaryObjectiveCompleted" BOOLEAN NOT NULL DEFAULT false,
    "objectivesCompletedList" JSONB NOT NULL DEFAULT '[]',
    "objectiveProgress" JSONB NOT NULL DEFAULT '{}',
    "totalLootCollected" INTEGER NOT NULL DEFAULT 0,
    "totalExperience" INTEGER NOT NULL DEFAULT 0,
    "totalGold" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_game_results" (
    "id" UUID NOT NULL,
    "gameResultId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "characterId" UUID NOT NULL,
    "characterClass" VARCHAR(50) NOT NULL,
    "characterName" VARCHAR(30) NOT NULL,
    "survived" BOOLEAN NOT NULL DEFAULT true,
    "wasExhausted" BOOLEAN NOT NULL DEFAULT false,
    "damageDealt" INTEGER NOT NULL DEFAULT 0,
    "damageTaken" INTEGER NOT NULL DEFAULT 0,
    "monstersKilled" INTEGER NOT NULL DEFAULT 0,
    "lootCollected" INTEGER NOT NULL DEFAULT 0,
    "cardsLost" INTEGER NOT NULL DEFAULT 0,
    "experienceGained" INTEGER NOT NULL DEFAULT 0,
    "goldGained" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_game_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "game_results_gameId_key" ON "game_results"("gameId");

-- CreateIndex
CREATE INDEX "game_results_gameId_idx" ON "game_results"("gameId");

-- CreateIndex
CREATE INDEX "game_results_completedAt_idx" ON "game_results"("completedAt");

-- CreateIndex
CREATE INDEX "game_results_victory_idx" ON "game_results"("victory");

-- CreateIndex
CREATE INDEX "player_game_results_gameResultId_idx" ON "player_game_results"("gameResultId");

-- CreateIndex
CREATE INDEX "player_game_results_userId_idx" ON "player_game_results"("userId");

-- CreateIndex
CREATE INDEX "player_game_results_characterId_idx" ON "player_game_results"("characterId");

-- AddForeignKey
ALTER TABLE "game_results" ADD CONSTRAINT "game_results_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_game_results" ADD CONSTRAINT "player_game_results_gameResultId_fkey" FOREIGN KEY ("gameResultId") REFERENCES "game_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_game_results" ADD CONSTRAINT "player_game_results_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
