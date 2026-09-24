import { prisma } from "@/db/client";
import { NOVA_MODES, type NovaMode } from "@/services/nova/modes";

export const NOVA_QUOTA_DEFAULTS = {
  FREE: 25_000,
  STARTER: 100_000,
  PRO: 300_000,
  PREMIUM: 750_000,
  DEFAULT_PAID: 150_000,
} as const;

const FREE_MODES: NovaMode[] = [
  "TUTOR",
  "STUDY",
  "REVISION",
  "DOUBT_SOLVER",
];

const PAID_MODES: NovaMode[] = Object.keys(NOVA_MODES) as NovaMode[];

type JsonRow = Record<string, unknown>;

function text(row: JsonRow, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (value != null && String(value).trim() !== "") {
      return String(value);
    }
  }
  return null;
}

function numberValue(row: JsonRow, keys: string[]): number | null {
  for (const key of keys) {
    const value = row[key];
    if (value == null) continue;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function dateValue(row: JsonRow, keys: string[]): Date | null {
  const value = text(row, keys);
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function envNumber(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function planKey(packageName: string | null): keyof typeof NOVA_QUOTA_DEFAULTS {
  const normalized = (packageName ?? "Free").toLowerCase();

  if (
    normalized.includes("premium") ||
    normalized.includes("ultimate") ||
    normalized.includes("max")
  ) {
    return "PREMIUM";
  }

  if (normalized.includes("pro")) {
    return "PRO";
  }

  if (
    normalized.includes("starter") ||
    normalized.includes("basic") ||
    normalized.includes("plus")
  ) {
    return "STARTER";
  }

  if (
    normalized.includes("free") ||
    normalized.includes("trial")
  ) {
    return "FREE";
  }

  return "DEFAULT_PAID";
}

function quotaForPlan(key: keyof typeof NOVA_QUOTA_DEFAULTS): number {
  switch (key) {
    case "FREE":
      return envNumber("NOVA_FREE_TOKENS", NOVA_QUOTA_DEFAULTS.FREE);
    case "STARTER":
      return envNumber("NOVA_STARTER_TOKENS", NOVA_QUOTA_DEFAULTS.STARTER);
    case "PRO":
      return envNumber("NOVA_PRO_TOKENS", NOVA_QUOTA_DEFAULTS.PRO);
    case "PREMIUM":
      return envNumber("NOVA_PREMIUM_TOKENS", NOVA_QUOTA_DEFAULTS.PREMIUM);
    default:
      return envNumber("NOVA_DEFAULT_PAID_TOKENS", NOVA_QUOTA_DEFAULTS.DEFAULT_PAID);
  }
}

async function getCurrentSubscription(userId: string): Promise<JsonRow | null> {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ data: JsonRow }>>(
      `SELECT to_jsonb(s) AS data
       FROM "Subscription" s
       WHERE s."userId" = $1
       ORDER BY s."createdAt" DESC NULLS LAST
       LIMIT 20`,
      userId,
    );

    const now = Date.now();

    const active = rows
      .map((row) => row.data)
      .find((row) => {
        const status = text(row, ["status"])?.toUpperCase();
        const expiresAt = dateValue(row, [
          "expiresAt",
          "endAt",
          "endDate",
          "currentPeriodEnd",
        ]);

        const statusActive =
          status === "ACTIVE" ||
          status === "RUNNING" ||
          status === "CURRENT";

        const notExpired =
          !expiresAt || expiresAt.getTime() > now;

        return statusActive && notExpired;
      });

    return active ?? null;
  } catch {
    return null;
  }
}

async function getPackage(packageId: string): Promise<JsonRow | null> {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ data: JsonRow }>>(
      `SELECT to_jsonb(p) AS data
       FROM "Package" p
       WHERE p."id" = $1
       LIMIT 1`,
      packageId,
    );

    return rows[0]?.data ?? null;
  } catch {
    return null;
  }
}

function getPeriod(): {
  start: Date;
  end: Date;
  key: string;
} {
  const now = new Date();
  const start = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    1,
  ));

  const end = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1,
    1,
  ));

  return {
    start,
    end,
    key: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`,
  };
}

export interface NovaEntitlements {
  planName: string;
  paid: boolean;
  quota: number;
  usedTokens: number;
  remainingTokens: number;
  resetAt: string;
  modes: NovaMode[];
  periodKey: string;
}

export async function getNovaEntitlements(
  userId: string,
): Promise<NovaEntitlements> {
  const subscription = await getCurrentSubscription(userId);

  let packageRow: JsonRow | null = null;
  let packageName = "Free";

  if (subscription) {
    const packageId = text(subscription, [
      "packageId",
      "planId",
      "productId",
    ]);

    if (packageId) {
      packageRow = await getPackage(packageId);
      packageName =
        text(packageRow ?? {}, ["name", "title", "planName"]) ??
        "Paid";
    }
  }

  const key = planKey(packageName);
  const quota = quotaForPlan(key);
  const paid = key !== "FREE";

  const period = getPeriod();

  let usedTokens = 0;

  try {
    const result = await prisma.$queryRawUnsafe<Array<{ total: number | bigint | null }>>(
      `SELECT COALESCE(SUM("totalTokens"), 0) AS total
       FROM "NovaAiUsage"
       WHERE "userId" = $1
         AND "periodKey" = $2`,
      userId,
      period.key,
    );

    usedTokens = Number(result[0]?.total ?? 0);
    if (!Number.isFinite(usedTokens)) usedTokens = 0;
  } catch {
    usedTokens = 0;
  }

  const remainingTokens = Math.max(0, quota - usedTokens);

  return {
    planName: packageName,
    paid,
    quota,
    usedTokens,
    remainingTokens,
    resetAt: period.end.toISOString(),
    modes: paid ? PAID_MODES : FREE_MODES,
    periodKey: period.key,
  };
}

export function getModeLabel(mode: NovaMode): string {
  return NOVA_MODES[mode].label;
}

export function defaultNovaMode(): NovaMode {
  return "TUTOR";
}