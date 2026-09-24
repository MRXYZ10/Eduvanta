import { prisma } from "@/db/client";
import {
  getNovaEntitlements,
} from "@/services/billing/entitlements";
import type { NovaMode } from "@/services/nova/modes";
import crypto from "node:crypto";

const MAX_RESERVATION = 12_000;
const RESERVATION_TTL_MINUTES = 15;

export class NovaQuotaError extends Error {
  code = "NOVA_QUOTA_EXCEEDED" as const;

  constructor(
    message: string,
    public readonly remainingTokens: number,
    public readonly resetAt: string,
  ) {
    super(message);
    this.name = "NovaQuotaError";
  }
}

export interface NovaQuotaReservation {
  requestId: string;
  userId: string;
  periodKey: string;
  reservedTokens: number;
}

function estimateReservation(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number | undefined,
): number {
  const inputChars = messages.reduce(
    (sum, message) => sum + message.content.length,
    0,
  );

  const estimatedInputTokens = Math.ceil(inputChars / 4);
  const outputTokens = Math.max(512, maxTokens ?? 4096);

  return Math.min(
    MAX_RESERVATION,
    Math.max(
      1_000,
      estimatedInputTokens + outputTokens,
    ),
  );
}

async function cleanupReservations() {
  await prisma.$executeRawUnsafe(
    `DELETE FROM "NovaQuotaReservation"
     WHERE "createdAt" < NOW() - INTERVAL '${RESERVATION_TTL_MINUTES} minutes'`,
  );
}

export async function reserveNovaQuota(
  userId: string,
  mode: NovaMode,
  messages: Array<{ role: string; content: string }>,
  maxTokens?: number,
): Promise<NovaQuotaReservation> {
  const entitlements = await getNovaEntitlements(userId);

  if (!entitlements.modes.includes(mode)) {
    throw new NovaQuotaError(
      `The ${mode.toLowerCase().replaceAll("_", " ")} mode is not available on your current plan.`,
      entitlements.remainingTokens,
      entitlements.resetAt,
    );
  }

  const reservationAmount = estimateReservation(messages, maxTokens);

  if (entitlements.remainingTokens <= 0) {
    throw new NovaQuotaError(
      "Your Nova monthly quota has been used. Upgrade your package or wait for the next reset.",
      0,
      entitlements.resetAt,
    );
  }

  const requestId = crypto.randomUUID();

  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `SELECT pg_advisory_xact_lock(hashtext($1))`,
      `${userId}:${entitlements.periodKey}`,
    );

    await tx.$executeRawUnsafe(
      `DELETE FROM "NovaQuotaReservation"
       WHERE "createdAt" < NOW() - INTERVAL '${RESERVATION_TTL_MINUTES} minutes'`,
    );

    const reservedResult = await tx.$queryRawUnsafe<Array<{ total: number | bigint | null }>>(
      `SELECT COALESCE(SUM("reservedTokens"), 0) AS total
       FROM "NovaQuotaReservation"
       WHERE "userId" = $1
         AND "periodKey" = $2`,
      userId,
      entitlements.periodKey,
    );

    const reservedAlready = Number(reservedResult[0]?.total ?? 0);

    const remainingForReservation =
      entitlements.quota -
      entitlements.usedTokens -
      reservedAlready;

    if (remainingForReservation <= 0) {
      throw new NovaQuotaError(
        "Nova is temporarily blocked because your remaining quota is already reserved by another request.",
        entitlements.remainingTokens,
        entitlements.resetAt,
      );
    }

    const reservedTokens = Math.min(
      reservationAmount,
      remainingForReservation,
    );

    await tx.$executeRawUnsafe(
      `INSERT INTO "NovaQuotaReservation"
       ("requestId", "userId", "periodKey", "reservedTokens", "createdAt")
       VALUES ($1, $2, $3, $4, NOW())`,
      requestId,
      userId,
      entitlements.periodKey,
      reservedTokens,
    );

    return {
      requestId,
      userId,
      periodKey: entitlements.periodKey,
      reservedTokens,
    };
  });
}

export async function finalizeNovaQuota(
  reservation: NovaQuotaReservation,
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    provider: string;
    model: string;
    mode: NovaMode;
  },
) {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `SELECT pg_advisory_xact_lock(hashtext($1))`,
      `${reservation.userId}:${reservation.periodKey}`,
    );

    await tx.$executeRawUnsafe(
      `INSERT INTO "NovaAiUsage"
       ("id", "requestId", "userId", "mode", "provider", "model",
        "inputTokens", "outputTokens", "totalTokens", "periodKey", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      crypto.randomUUID(),
      reservation.requestId,
      reservation.userId,
      usage.mode,
      usage.provider,
      usage.model,
      Math.max(0, Math.floor(usage.inputTokens)),
      Math.max(0, Math.floor(usage.outputTokens)),
      Math.max(0, Math.floor(usage.totalTokens)),
      reservation.periodKey,
    );

    await tx.$executeRawUnsafe(
      `DELETE FROM "NovaQuotaReservation"
       WHERE "requestId" = $1`,
      reservation.requestId,
    );
  });
}

export async function releaseNovaQuota(
  requestId: string,
) {
  await prisma.$executeRawUnsafe(
    `DELETE FROM "NovaQuotaReservation"
     WHERE "requestId" = $1`,
    requestId,
  );
}