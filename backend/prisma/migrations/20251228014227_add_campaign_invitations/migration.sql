-- CreateEnum
CREATE TYPE "invitation_status" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateTable
CREATE TABLE "campaign_invitations" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "invitedUserId" UUID NOT NULL,
    "invitedUsername" VARCHAR(20) NOT NULL,
    "invitedByUserId" UUID NOT NULL,
    "status" "invitation_status" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_invite_tokens" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "token" VARCHAR(32) NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "maxUses" SMALLINT NOT NULL DEFAULT 1,
    "usedCount" SMALLINT NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_invite_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campaign_invitations_campaignId_idx" ON "campaign_invitations"("campaignId");

-- CreateIndex
CREATE INDEX "campaign_invitations_invitedUserId_status_idx" ON "campaign_invitations"("invitedUserId", "status");

-- CreateIndex
CREATE INDEX "campaign_invitations_invitedByUserId_idx" ON "campaign_invitations"("invitedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_invitations_campaignId_invitedUserId_key" ON "campaign_invitations"("campaignId", "invitedUserId");

-- CreateIndex
CREATE INDEX "campaign_invite_tokens_token_idx" ON "campaign_invite_tokens"("token");

-- CreateIndex
CREATE INDEX "campaign_invite_tokens_campaignId_isRevoked_expiresAt_idx" ON "campaign_invite_tokens"("campaignId", "isRevoked", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_invite_tokens_token_key" ON "campaign_invite_tokens"("token");

-- AddForeignKey
ALTER TABLE "campaign_invitations" ADD CONSTRAINT "campaign_invitations_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_invitations" ADD CONSTRAINT "campaign_invitations_invitedUserId_fkey" FOREIGN KEY ("invitedUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_invitations" ADD CONSTRAINT "campaign_invitations_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_invite_tokens" ADD CONSTRAINT "campaign_invite_tokens_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_invite_tokens" ADD CONSTRAINT "campaign_invite_tokens_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
