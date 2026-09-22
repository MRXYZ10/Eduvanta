import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/db/client";
import { getCurrentUser } from "@/lib/auth";

const RequestSchema = z.object({ mistakeId: z.string() });

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = RequestSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const mistake = await prisma.mistake.findFirst({ where: { id: parsed.data.mistakeId, userId: user.id } });
  if (!mistake) return NextResponse.json({ error: "Mistake not found" }, { status: 404 });

  await prisma.mistake.update({ where: { id: mistake.id }, data: { resolved: true } });
  return NextResponse.json({ resolved: true });
}
