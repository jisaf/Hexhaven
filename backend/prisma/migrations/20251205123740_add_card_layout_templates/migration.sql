-- AlterTable
ALTER TABLE "ability_cards" ADD COLUMN     "layoutTemplateId" UUID;

-- CreateTable
CREATE TABLE "card_layout_templates" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "modules" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "card_layout_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "card_layout_templates_name_key" ON "card_layout_templates"("name");

-- CreateIndex
CREATE INDEX "ability_cards_layoutTemplateId_idx" ON "ability_cards"("layoutTemplateId");

-- AddForeignKey
ALTER TABLE "ability_cards" ADD CONSTRAINT "ability_cards_layoutTemplateId_fkey" FOREIGN KEY ("layoutTemplateId") REFERENCES "card_layout_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
