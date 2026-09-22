import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // Same clear error on the client side — otherwise login/signup fail
    // with a confusing "Invalid URL" from deep inside the Supabase SDK.
    throw new Error(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env file (see .env.example), then restart `next dev`.",
    );
  }

  return createBrowserClient(url, anonKey);
}
