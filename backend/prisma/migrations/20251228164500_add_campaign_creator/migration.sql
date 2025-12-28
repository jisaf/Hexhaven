-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN "createdByUserId" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "campaigns_createdByUserId_idx" ON "campaigns"("createdByUserId");

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
