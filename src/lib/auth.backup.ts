import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/db/client";

/**
 * Resolves the authenticated user for the current request (Supabase Auth
 * session -> our User row). Every server component/API route that touches
 * student data calls this first and redirects/401s if it returns null.
 *
 * On a user's very first authenticated request (e.g. right after email
 * verification), there's a Supabase auth identity but no local User row
 * yet — this provisions one on the fly rather than requiring a separate
 * signup-completion step that could be skipped or fail silently.
 */
export async function getCurrentUser() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();

  if (!supabaseUser?.email) return null;

  const user = await prisma.user.upsert({
    where: { email: supabaseUser.email },
    update: {}, // don't overwrite role/etc. on every request — just ensure existence
    create: {
      email: supabaseUser.email,
      role: "STUDENT",
      emailVerified: supabaseUser.email_confirmed_at ? new Date(supabaseUser.email_confirmed_at) : null,
    },
    include: { profile: true },
  });

  return user;
}

export function requireRole<T extends { role: string }>(user: T | null, allowed: T["role"][]): asserts user is T {
  if (!user || !allowed.includes(user.role)) {
    throw new Error("FORBIDDEN");
  }
}
