-- CreateTable
CREATE TABLE "scenario_narratives" (
    "id" UUID NOT NULL,
    "scenarioId" UUID NOT NULL,
    "introTitle" VARCHAR(200),
    "introText" TEXT,
    "introImageUrl" VARCHAR(500),
    "victoryTitle" VARCHAR(200),
    "victoryText" TEXT,
    "victoryImageUrl" VARCHAR(500),
    "defeatTitle" VARCHAR(200),
    "defeatText" TEXT,
    "defeatImageUrl" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scenario_narratives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "narrative_triggers" (
    "id" UUID NOT NULL,
    "narrativeId" UUID NOT NULL,
    "triggerId" VARCHAR(100) NOT NULL,
    "displayOrder" SMALLINT NOT NULL DEFAULT 0,
    "title" VARCHAR(200),
    "text" TEXT NOT NULL,
    "imageUrl" VARCHAR(500),
    "conditions" JSONB NOT NULL,
    "rewards" JSONB,
    "gameEffects" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "narrative_triggers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scenario_narratives_scenarioId_key" ON "scenario_narratives"("scenarioId");

-- CreateIndex
CREATE INDEX "narrative_triggers_narrativeId_idx" ON "narrative_triggers"("narrativeId");

-- AddForeignKey
ALTER TABLE "scenario_narratives" ADD CONSTRAINT "scenario_narratives_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "narrative_triggers" ADD CONSTRAINT "narrative_triggers_narrativeId_fkey" FOREIGN KEY ("narrativeId") REFERENCES "scenario_narratives"("id") ON DELETE CASCADE ON UPDATE CASCADE;
