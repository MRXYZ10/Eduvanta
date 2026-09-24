import { NextResponse } from "next/server";
import { prisma } from "@/db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      ok: true,
      database: "ok",
      uptimeMs: Date.now() - startedAt,
    });
  } catch {
    return NextResponse.json(
      { ok: false, database: "unavailable" },
      { status: 503 },
    );
  }
}
