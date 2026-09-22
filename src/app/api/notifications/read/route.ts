import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/db/client";
import { getCurrentUser } from "@/lib/auth";

const RequestSchema = z.union([z.object({ notificationId: z.string() }), z.object({ all: z.literal(true) })]);

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = RequestSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  if ("all" in parsed.data) {
    await prisma.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
    return NextResponse.json({ markedAll: true });
  }

  // Ownership check — a notification ID must belong to this user.
  const notification = await prisma.notification.findFirst({
    where: { id: parsed.data.notificationId, userId: user.id },
  });
  if (!notification) return NextResponse.json({ error: "Notification not found" }, { status: 404 });

  await prisma.notification.update({ where: { id: notification.id }, data: { read: true } });
  return NextResponse.json({ read: true });
}
