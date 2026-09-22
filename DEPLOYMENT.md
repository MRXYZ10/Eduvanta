# Deployment

## Environment variables

See `.env.example` for the full list with inline comments. Summary of
what's required vs. optional:

| Variable | Required? | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Postgres with `pgvector` extension enabled |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | From your Supabase project settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public/anon key, safe to expose client-side |
| `SUPABASE_SERVICE_ROLE_KEY` | Not currently used | Reserved for future server-side admin operations against Supabase directly; nothing in this codebase reads it yet |
| `AI_PROVIDER` | No (defaults to `anthropic`) | `anthropic` \| `openai` \| `gemini` |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GEMINI_API_KEY` | At least one, matching `AI_PROVIDER` | Missing key + `NODE_ENV=production` throws loudly rather than silently mocking |
| `OPENAI_API_KEY` (again) | Yes, for RAG | Required for embeddings regardless of `AI_PROVIDER` — see below |
| `NODE_ENV` | Set by your host, usually | Controls the mock-provider fallback behavior |

## Database setup

1. Provision Postgres. If using Supabase's, enable `pgvector` once:
   Database → Extensions → search "vector" → enable. Otherwise connect
   directly and run `CREATE EXTENSION IF NOT EXISTS vector;`.
2. `npx prisma migrate deploy` — applies all committed migrations without
   the interactive prompts `migrate dev` uses locally. Run this as part of
   your deploy pipeline, before the app starts serving traffic.
3. Seeding (`npm run db:seed`) is a local/staging convenience — every
   seeded record is tagged `[demo]`. Don't run it against a production
   database with real users.

## Supabase Auth setup

1. Create a project, copy its URL + anon key into your environment.
2. Authentication → Providers → enable Email.
3. Authentication → URL Configuration → set your production domain as a
   Redirect URL (the app's `emailRedirectTo` in `SignupForm.tsx` and
   `ForgotPasswordForm.tsx` point back to `${window.location.origin}/auth/callback`
   and `/reset-password` respectively — these must be allow-listed in
   Supabase or the redirect will be rejected).

## AI provider setup

Pick one via `AI_PROVIDER` and set its matching key. Regardless of that
choice, **RAG embeddings always use OpenAI** (`getEmbeddingProvider()` in
`services/ai/factory.ts`) — Anthropic and this app's Gemini provider don't
implement an embeddings API. If you're running with `AI_PROVIDER=anthropic`
and want course-material upload/search to work, you still need
`OPENAI_API_KEY` set.

## Hosting

Built as a standard Next.js 14 App Router project — deploys cleanly to
Vercel or any Node hosting that supports Next.js's server runtime.
One constraint: `/api/materials/upload` sets `export const runtime =
"nodejs"` explicitly because `pdf-parse` needs Node APIs unavailable on
the Edge runtime — don't move that route to Edge.

## What a real production deploy still needs (not built here)

- **A background job scheduler.** Nothing in this codebase runs on a
  timer. Notification reminders are reactive (fire when a relevant page
  loads — see `ARCHITECTURE.md`'s Notifications section), not proactive.
  For real "remind me before it's due" behavior, add Vercel Cron or a
  Supabase scheduled function that periodically calls the same
  `checkStudyReminder()`/dedup logic already written, rather than relying
  on a page load to trigger it.
- **A shared rate-limit store for multi-instance deployments.** See
  `SECURITY.md` — the current limiter is in-memory and per-instance.
- **Log aggregation/alerting.** Structured JSON logging for AI latency,
  AI errors, and several previously-silent failure paths is built
  (`services/observability/logger.ts`) and emits to `console.log`/
  `console.error`, which your host's default log pipeline (Vercel
  included) captures automatically — nothing to configure to get logs.
  What's still missing is aggregation into a queryable store and
  dashboards/alerts on top of them; pipe stdout/stderr into a log
  aggregator (Axiom, Datadog, or your host's native log drain) if that's
  needed, and consider persisting `logAiCall`/`logApiError` events to a
  table if the Admin Dashboard should eventually chart them instead of
  showing the current DB-derived proxy.
- **A CDN/image pipeline** if course material or generated content ever
  includes images — nothing in this codebase currently serves images
  besides Next's default static asset handling.
