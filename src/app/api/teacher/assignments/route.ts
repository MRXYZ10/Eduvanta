import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/db/client";
import { getCurrentUser, requireRole } from "@/lib/auth";

const RequestSchema = z.object({
  courseId: z.string(),
  title: z.string().min(1).max(200),
  dueDate: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  try {
    requireRole(user, ["TEACHER", "ADMIN"]);
  } catch {
    return NextResponse.json({ error: "Only teachers or admins can create assignments" }, { status: 403 });
  }

  const parsed = RequestSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { courseId, title, dueDate } = parsed.data;

  // Authorization: a teacher can only create assignments on their own courses.
  const course = await prisma.course.findFirst({ where: { id: courseId, teacherId: user!.id } });
  if (!course && user!.role !== "ADMIN") {
    return NextResponse.json({ error: "You don't teach this course" }, { status: 403 });
  }

  const assignment = await prisma.assignment.create({
    data: { courseId, teacherId: user!.id, title, dueDate: dueDate ? new Date(dueDate) : null },
  });

  return NextResponse.json({ assignment });
}
