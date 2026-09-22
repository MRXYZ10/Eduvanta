# Security

## Authentication

Supabase Auth via `@supabase/ssr` (not the deprecated
`auth-helpers-nextjs`). `middleware.ts` runs on every request, calls
`supabase.auth.getUser()` (re-validates against Supabase rather than
trusting a possibly-stale cookie), and writes back a refreshed session
cookie. Unauthenticated requests to a *page* redirect to `/login`.
Unauthenticated requests to `/api/*` are deliberately **not** redirected
by middleware — a redirect would resolve to `/login`'s HTML, silently
breaking every client-side `.json()` call. Each route handler calls
`getCurrentUser()` itself and returns a real `401` instead.

`getCurrentUser()` (`lib/auth.ts`) upserts a local `User` row keyed on the
Supabase-verified email on every call — there's no separate "link your
account" step a student could get stuck on after email verification.

Login and forgot-password intentionally give the same response whether or
not an email is registered, so neither page can be used to enumerate
which addresses have accounts.

## Authorization

Role-based: `User.role` is `STUDENT | TEACHER | ADMIN`. `requireRole(user,
allowed)` throws if the user's role isn't in the allowed list; routes that
need it wrap the call in try/catch and return `403` (see
`app/api/teacher/*`). `requireRole` is a TypeScript assertion function —
after a successful call, the type checker knows `user` is non-null with
the narrowed role, not just at runtime.

Every route that touches a specific record checks ownership explicitly
rather than trusting a client-supplied ID:
- `Attempt`/`ExamAttempt`/`Mistake`/`StudyPlan` lookups are always scoped
  `where: { id, userId: user.id }`, not just `where: { id }`.
- Teachers can only create assignments on courses where
  `Course.teacherId === user.id` (admins bypass this — see
  `app/api/teacher/assignments/route.ts`).
- Material deletion checks `uploaderId === user.id` OR a teacher/admin role.

Answers are always graded server-side against the stored
`Question.correctAnswer` — the client never sends "is this correct,"
only the raw answer. Question options are stripped of `isCorrect` before
being sent to a student mid-practice/exam.

## Rate limiting

Per-user sliding-window limits on every AI-calling route
(`services/security/rateLimit.ts`), sized per route cost — see `API.md`
for which bucket each route uses. **This is in-memory and per-server-
instance.** Correct for local dev and a single-instance deployment; a
multi-instance production deployment needs the `hits` Map inside
`SlidingWindowRateLimiter` replaced with a shared store (Redis/Upstash),
or a user effectively gets `limit` requests *per instance* rather than
overall. The windowing logic itself doesn't need to change — see the
class's doc comment.

## Input validation

Every API route validates its request body with a Zod schema before doing
anything else with it — a `safeParse` failure returns `400` with the
validation `issues`, never a partially-processed request. AI-generated
structured output is validated the same way before it's trusted: see
`services/ai/validate.ts` (practice feedback, generated questions) and
`services/ai/generateQuestion.ts`'s one-correction-attempt pipeline —
a question that still fails validation after one AI retry is discarded,
never persisted, never shown to a student.

Numeric fields the AI returns that affect stored data (e.g.
`mastery_delta`) are range-clamped in the Zod schema itself
(`.min(-10).max(10)`), not just type-checked — the model can't swing a
score wildly even if it tries to.

## What's not done yet

- **CSRF**: Next.js Route Handlers reading JSON bodies from `fetch()`
  (not HTML form submissions) are inherently less exposed to classic CSRF
  than form-based apps, but no explicit CSRF token scheme exists. Worth
  adding if any route ever accepts traditional form POSTs.
- **Row-Level Security (RLS)**: authorization is enforced entirely at the
  application layer (the ownership checks described above), not at the
  Postgres level. If this app ever exposes direct database access (e.g. a
  Supabase client-side query bypassing the API layer), RLS policies would
  need to be added — right now, nothing queries Postgres except this
  server-side code, so app-layer checks are sufficient but not
  defense-in-depth.
- **File upload scanning**: `/api/materials/upload` checks file size and
  MIME/extension but doesn't scan content for malware — acceptable for a
  trusted-user MVP, not for a public-upload surface.
- **Assignment/exam reminder scoping**: `Enrollment` now exists (see
  `DATABASE.md`), so the teacher dashboard's roster count is real, but
  assignment-due and exam-date notification triggers still aren't wired
  to it — a smaller follow-up now that the underlying model exists.
- **Audit logging**: no record of who changed what, when (e.g. a teacher
  editing an assignment). Add if this ever needs compliance-grade traceability.
