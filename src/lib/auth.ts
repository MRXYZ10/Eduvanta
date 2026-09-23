import { unstable_cache } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/db/client";

const getCachedUserByEmail = unstable_cache(
  async (email: string) => {
    return prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });
  },
  ["eduvanta-current-user"],
  {
    revalidate: 30,
  },
);

/**
 * Resolves the authenticated user for the current request.
 *
 * Supabase claims identify the authenticated account, while Prisma resolves
 * the corresponding EduVanta User row and profile.
 */
export async function getCurrentUser() {
  const authStart = Date.now();
  const supabase = createSupabaseServerClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;

  const email =
    typeof claims?.email === "string"
      ? claims.email
      : null;

  if (!email) return null;

  console.log(
    `[AUTH PERF] Supabase getClaims: ${Date.now() - authStart} ms`,
  );

  const dbStart = Date.now();

  let user = await getCachedUserByEmail(email);

  console.log(
    `[AUTH PERF] User lookup/cache: ${Date.now() - dbStart} ms`,
  );

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        role: "STUDENT",
        emailVerified:
          typeof claims?.email_confirmed_at === "string"
            ? new Date(claims.email_confirmed_at)
            : null,
      },
      include: { profile: true },
    });
  }

  console.log(
    `[AUTH PERF] getCurrentUser total: ${Date.now() - authStart} ms`,
  );

  return user;
}

export function requireRole<T extends { role: string }>(
  user: T | null,
  allowed: T["role"][],
): asserts user is T {
  if (!user || !allowed.includes(user.role)) {
    throw new Error("FORBIDDEN");
  }
}