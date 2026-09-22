import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client for Server Components, Route Handlers, and
 * Server Actions. Uses @supabase/ssr (the current recommended package —
 * @supabase/auth-helpers-nextjs is in maintenance mode) so session cookies
 * refresh correctly under the Next.js App Router.
 *
 * NOTE: in a Server Component, cookies() is read-only — Supabase's attempt
 * to *set* a refreshed cookie there will throw. That's expected and safe to
 * swallow (see catch blocks below): the middleware (see middleware.ts) is
 * what actually refreshes the session cookie on every request, so Server
 * Components only ever need to read it.
 */
export function createSupabaseServerClient() {
  const cookieStore = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // Throws a clear, actionable error instead of the cryptic "Invalid URL"
    // that @supabase/ssr throws when given an empty string.
    throw new Error(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env file (see .env.example).",
    );
  }

  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Called from a Server Component — middleware handles refresh instead.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          // Called from a Server Component — middleware handles refresh instead.
        }
      },
    },
  });
}
