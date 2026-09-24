import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCourseCatalog } from "@/services/courses/getCourseCatalog";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ courses: await getCourseCatalog(user.id) });
}
