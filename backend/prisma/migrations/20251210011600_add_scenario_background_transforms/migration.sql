-- AlterTable
ALTER TABLE "scenarios" ADD COLUMN     "backgroundImageUrl" VARCHAR(500),
ADD COLUMN     "backgroundOffsetX" INTEGER DEFAULT 0,
ADD COLUMN     "backgroundOffsetY" INTEGER DEFAULT 0,
ADD COLUMN     "backgroundOpacity" DOUBLE PRECISION DEFAULT 1.0,
ADD COLUMN     "backgroundScale" DOUBLE PRECISION DEFAULT 1.0;
