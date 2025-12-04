-- AlterTable
ALTER TABLE "games" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "difficulty" SMALLINT NOT NULL DEFAULT 1,
ADD COLUMN     "startedAt" TIMESTAMP(3);
