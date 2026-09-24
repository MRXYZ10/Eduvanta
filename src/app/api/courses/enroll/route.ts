import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/db/client";
import { getCurrentUser } from "@/lib/auth";

const Schema = z.object({ courseId: z.string().min(1) });

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid course" }, { status: 400 });

  const course = await prisma.course.findUnique({ where: { id: parsed.data.courseId }, select: { id: true, title: true } });
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  const enrollment = await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: user.id, courseId: course.id } },
    update: {},
    create: { userId: user.id, courseId: course.id },
  });

  return NextResponse.json({ enrollment, message: `Enrolled in ${course.title}` });
}
