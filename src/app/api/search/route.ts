import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { searchAll } from "@/services/search/searchAll";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const query = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (query.length < 2) {
    return NextResponse.json({ topics: [], questions: [], materials: [], conversations: [] });
  }
  if (query.length > 120) {
    return NextResponse.json({ error: "Search query is too long" }, { status: 400 });
  }
  const results = await searchAll(query, user.id);

  return NextResponse.json(results);
}
