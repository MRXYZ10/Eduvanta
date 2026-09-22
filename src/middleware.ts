import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that don't require a signed-in session. Everything else redirects
// to /login if there's no valid session — see PRODUCT SPEC "Protected routes".
const PUBLIC_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password", "/auth/callback"];

// "/" is public (the landing page for logged-out visitors) but is
// deliberately NOT in PUBLIC_ROUTES above, which is matched via
// `.startsWith()` — `"/".startsWith("/")` would be true for every path in
// the app, silently disabling auth gating everywhere. It gets its own
// exact-match check instead.
function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

// If Supabase env vars are missing/empty (e.g. fresh clone, .env not filled
// in yet), createServerClient() throws synchronously — and since this
// middleware runs on almost every route, that used to take down EVERY page
// (including the public landing page) instead of just the parts that
// actually need auth. We fail open instead: skip the auth check entirely
// and log a clear one-time warning, so `next dev` at least boots and the
// public pages render while the app is still being configured.
function hasSupabaseEnv(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

let warnedMissingEnv = false;

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  if (!hasSupabaseEnv()) {
    if (!warnedMissingEnv) {
      warnedMissingEnv = true;
      console.warn(
        "[middleware] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set — " +
          "skipping auth checks so the app can still boot. Fill these in your .env file to enable login. " +
          "See .env.example.",
      );
    }
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    },
  );

  // getUser() (not getSession()) — this re-validates the token against
  // Supabase rather than trusting a possibly-stale local cookie, and this
  // call is also what actually triggers the refreshed cookie to be written
  // via the set() callback above.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicRoute = isPublicPath(request.nextUrl.pathname);
  const isApiRoute = request.nextUrl.pathname.startsWith("/api");

  // API routes never get redirected to a login *page* — a fetch() call
  // expects JSON back, and a redirect would resolve to login's HTML,
  // breaking every client-side .json() call silently. Each route handler
  // already does its own getCurrentUser() check and returns a proper 401
  // (see e.g. /api/tutor/chat) — middleware here only needs to keep the
  // session cookie fresh for them, not gate access.
  if (!user && !isPublicRoute && !isApiRoute) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && (request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/signup" || request.nextUrl.pathname === "/")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Skip static assets and Next internals; run on everything else,
    // including API routes, so their sessions stay fresh too.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
