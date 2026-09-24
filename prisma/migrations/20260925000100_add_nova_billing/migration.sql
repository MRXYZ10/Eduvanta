-- EduVanta Nova billing usage tables.
-- These tables intentionally use raw SQL access from the billing service,
-- so the existing Prisma Package/Subscription schema does not need to be
-- duplicated or guessed.

CREATE TABLE IF NOT EXISTS "NovaAiUsage" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "periodKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NovaAiUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NovaAiUsage_requestId_key"
ON "NovaAiUsage"("requestId");

CREATE INDEX IF NOT EXISTS "NovaAiUsage_userId_periodKey_idx"
ON "NovaAiUsage"("userId", "periodKey");

CREATE INDEX IF NOT EXISTS "NovaAiUsage_createdAt_idx"
ON "NovaAiUsage"("createdAt");

CREATE TABLE IF NOT EXISTS "NovaQuotaReservation" (
    "requestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "reservedTokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NovaQuotaReservation_pkey" PRIMARY KEY ("requestId")
);

CREATE INDEX IF NOT EXISTS "NovaQuotaReservation_userId_periodKey_idx"
ON "NovaQuotaReservation"("userId", "periodKey");

CREATE INDEX IF NOT EXISTS "NovaQuotaReservation_createdAt_idx"
ON "NovaQuotaReservation"("createdAt");